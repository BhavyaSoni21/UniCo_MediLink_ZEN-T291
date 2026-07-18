import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { PharmacyService } from './pharmacy.service';
import { ReserveMedicineDto } from './dto/reserve-medicine.dto';

@Controller('pharmacy')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Patient)
export class ReservationsController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Post('pharmacies/:pharmacyId/reserve')
  reserve(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: ReserveMedicineDto,
  ) {
    return this.pharmacyService.reserve(user.sub, pharmacyId, dto);
  }

  @Get('reservations/me')
  listMine(@CurrentUser() user: VerifiedTokenPayload) {
    return this.pharmacyService.listForPatient(user.sub);
  }

  @Post('reservations/:reservationId/cancel')
  cancel(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('reservationId') reservationId: string,
  ) {
    return this.pharmacyService.cancel(user.sub, reservationId);
  }
}
