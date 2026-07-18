import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { ReserveMedicineDto } from './dto/reserve-medicine.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function generatePickupCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsService,
  ) {}

  async searchMedicines(query: string) {
    const medicines = await this.prisma.medicines.findMany({
      where: {
        OR: [
          { generic_name: { contains: query, mode: 'insensitive' } },
          { brand_name: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { generic_name: 'asc' },
    });

    const allByGeneric = new Map<string, typeof medicines>();
    if (medicines.length > 0) {
      const genericNames = [...new Set(medicines.map((m) => m.generic_name))];
      const related = await this.prisma.medicines.findMany({
        where: { generic_name: { in: genericNames } },
      });
      for (const name of genericNames) {
        allByGeneric.set(
          name,
          related.filter((m) => m.generic_name === name),
        );
      }
    }

    return medicines.map((m) => ({
      id: m.id,
      genericName: m.generic_name,
      brandName: m.brand_name,
      manufacturer: m.manufacturer,
      dosageForm: m.dosage_form,
      strength: m.strength,
      genericAlternatives: (allByGeneric.get(m.generic_name) ?? [])
        .filter((alt) => alt.id !== m.id)
        .map((alt) => ({ id: alt.id, brandName: alt.brand_name, manufacturer: alt.manufacturer })),
    }));
  }

  private async resolveLocation(userId: string, lat?: number, lng?: number) {
    if (lat !== undefined && lng !== undefined) {
      return { lat, lng };
    }
    const patient = await this.prisma.patients.findUnique({
      where: { user_id: userId },
      include: { address: true },
    });
    const addrLat = patient?.address?.latitude;
    const addrLng = patient?.address?.longitude;
    if (addrLat == null || addrLng == null) {
      throw new BadRequestException(
        'No location available — provide lat/lng or set your address with coordinates first',
      );
    }
    return { lat: Number(addrLat), lng: Number(addrLng) };
  }

  async getNearby(userId: string, lat?: number, lng?: number, medicineId?: string) {
    const location = await this.resolveLocation(userId, lat, lng);

    const pharmacies = await this.prisma.pharmacies.findMany({
      include: {
        inventory: medicineId ? { where: { medicine_id: medicineId } } : false,
      },
    });

    return pharmacies
      .map((p) => {
        const stockRow = medicineId
          ? (p as unknown as { inventory: Array<{ stock_quantity: number; is_available: boolean }> })
              .inventory[0]
          : undefined;
        return {
          id: p.id,
          name: p.pharmacy_name,
          city: p.city,
          verified: p.verified,
          distanceKm: Math.round(haversineKm(location.lat, location.lng, Number(p.latitude), Number(p.longitude)) * 10) / 10,
          stock: medicineId
            ? {
                quantity: stockRow?.stock_quantity ?? 0,
                available: (stockRow?.is_available ?? false) && (stockRow?.stock_quantity ?? 0) > 0,
              }
            : null,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async checkAvailability(userId: string, medicineId: string, lat?: number, lng?: number) {
    const medicine = await this.prisma.medicines.findUnique({ where: { id: medicineId } });
    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    const nearby = await this.getNearby(userId, lat, lng, medicineId);
    return nearby.filter((p) => p.stock?.available);
  }

  async getById(pharmacyId: string) {
    const pharmacy = await this.prisma.pharmacies.findUnique({
      where: { id: pharmacyId },
      include: { inventory: { include: { medicines: true } } },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    return {
      id: pharmacy.id,
      name: pharmacy.pharmacy_name,
      addressLine1: pharmacy.address_line_1,
      city: pharmacy.city,
      state: pharmacy.state,
      latitude: Number(pharmacy.latitude),
      longitude: Number(pharmacy.longitude),
      verified: pharmacy.verified,
      contactNumber: pharmacy.contact_number,
      inventory: pharmacy.inventory.map((i) => ({
        medicineId: i.medicine_id,
        genericName: i.medicines.generic_name,
        brandName: i.medicines.brand_name,
        stockQuantity: i.stock_quantity,
        isAvailable: i.is_available,
      })),
    };
  }

  async updateInventory(pharmacyId: string, dto: UpdateInventoryDto) {
    const pharmacy = await this.prisma.pharmacies.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    const medicine = await this.prisma.medicines.findUnique({ where: { id: dto.medicineId } });
    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    await this.prisma.pharmacy_inventory.upsert({
      where: {
        pharmacy_id_medicine_id: { pharmacy_id: pharmacyId, medicine_id: dto.medicineId },
      },
      update: {
        stock_quantity: dto.stockQuantity,
        ...(dto.isAvailable !== undefined && { is_available: dto.isAvailable }),
      },
      create: {
        pharmacy_id: pharmacyId,
        medicine_id: dto.medicineId,
        stock_quantity: dto.stockQuantity,
        is_available: dto.isAvailable ?? true,
      },
    });

    return this.getById(pharmacyId);
  }

  async reserve(userId: string, pharmacyId: string, dto: ReserveMedicineDto) {
    const patientId = await this.patients.getPatientIdForUser(userId);

    const pharmacy = await this.prisma.pharmacies.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const reservation = await this.prisma.$transaction(async (tx) => {
      const inventory = await tx.pharmacy_inventory.findUnique({
        where: {
          pharmacy_id_medicine_id: { pharmacy_id: pharmacyId, medicine_id: dto.medicineId },
        },
      });
      if (!inventory || !inventory.is_available || inventory.stock_quantity < dto.quantity) {
        throw new BadRequestException('Not enough stock available to reserve that quantity');
      }

      await tx.pharmacy_inventory.update({
        where: { id: inventory.id },
        data: { stock_quantity: inventory.stock_quantity - dto.quantity },
      });

      return tx.medicine_reservations.create({
        data: {
          patient_id: patientId,
          pharmacy_id: pharmacyId,
          medicine_id: dto.medicineId,
          quantity: dto.quantity,
          pickup_code: generatePickupCode(),
        },
      });
    });

    return this.toReservationResponse(reservation.id);
  }

  async listForPatient(userId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const reservations = await this.prisma.medicine_reservations.findMany({
      where: { patient_id: patientId },
      include: { pharmacies: true, medicines: true },
      orderBy: { created_at: 'desc' },
    });
    return reservations.map(toReservationSummary);
  }

  async cancel(userId: string, reservationId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const reservation = await this.prisma.medicine_reservations.findUnique({
      where: { id: reservationId },
    });
    if (!reservation || reservation.patient_id !== patientId) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.status === 'CANCELLED') {
      return this.toReservationResponse(reservationId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.medicine_reservations.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
      });
      const inventory = await tx.pharmacy_inventory.findUnique({
        where: {
          pharmacy_id_medicine_id: {
            pharmacy_id: reservation.pharmacy_id,
            medicine_id: reservation.medicine_id,
          },
        },
      });
      if (inventory) {
        await tx.pharmacy_inventory.update({
          where: { id: inventory.id },
          data: { stock_quantity: inventory.stock_quantity + reservation.quantity },
        });
      }
    });

    return this.toReservationResponse(reservationId);
  }

  private async toReservationResponse(reservationId: string) {
    const reservation = await this.prisma.medicine_reservations.findUnique({
      where: { id: reservationId },
      include: { pharmacies: true, medicines: true },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return toReservationSummary(reservation);
  }
}

interface ReservationRow {
  id: string;
  quantity: number;
  status: string;
  pickup_code: string;
  created_at: Date;
  pharmacies: { id: string; pharmacy_name: string };
  medicines: { id: string; generic_name: string; brand_name: string | null };
}

function toReservationSummary(r: ReservationRow) {
  return {
    id: r.id,
    pharmacyId: r.pharmacies.id,
    pharmacyName: r.pharmacies.pharmacy_name,
    medicineId: r.medicines.id,
    medicineName: r.medicines.brand_name ?? r.medicines.generic_name,
    quantity: r.quantity,
    status: r.status,
    pickupCode: r.pickup_code,
    createdAt: r.created_at,
  };
}
