export interface MedicineSearchResult {
  id: string;
  genericName: string;
  brandName: string | null;
  manufacturer: string | null;
  dosageForm: string | null;
  strength: string | null;
  genericAlternatives: Array<{ id: string; brandName: string | null; manufacturer: string | null }>;
}

export interface NearbyPharmacy {
  id: string;
  name: string;
  city: string | null;
  verified: boolean;
  distanceKm: number;
  stock: { quantity: number; available: boolean } | null;
}

export interface Reservation {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  status: string;
  pickupCode: string;
  createdAt: string;
}
