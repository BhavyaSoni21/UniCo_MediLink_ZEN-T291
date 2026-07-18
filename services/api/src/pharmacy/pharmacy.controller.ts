import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { PharmacyService } from './pharmacy.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Controller('pharmacy')
@UseGuards(AuthGuard)
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('medicines/search')
  searchMedicines(@Query('q') q: string) {
    return this.pharmacyService.searchMedicines(q ?? '');
  }

  @Get('pharmacies/nearby')
  getNearby(
    @CurrentUser() user: VerifiedTokenPayload,
    @Query() query: NearbyQueryDto,
  ) {
    return this.pharmacyService.getNearby(user.sub, query.lat, query.lng, query.medicineId);
  }

  @Post('lookup/check')
  checkAvailability(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: CheckAvailabilityDto,
  ) {
    return this.pharmacyService.checkAvailability(user.sub, dto.medicineId, dto.lat, dto.lng);
  }

  @Get('pharmacies/:pharmacyId')
  getById(@Param('pharmacyId') pharmacyId: string) {
    return this.pharmacyService.getById(pharmacyId);
  }

  @Post('pharmacies/:pharmacyId/inventory')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  updateInventory(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.pharmacyService.updateInventory(pharmacyId, dto);
  }
}
