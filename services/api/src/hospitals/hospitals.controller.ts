import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HospitalsService } from './hospitals.service';
import { UpdateOperationalStatusDto } from './dto/update-operational-status.dto';

@Controller('hospitals')
@UseGuards(AuthGuard)
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Get('search')
  search(
    @Query('city') city?: string,
    @Query('specializationId') specializationId?: string,
  ) {
    return this.hospitalsService.search(
      city,
      specializationId ? Number(specializationId) : undefined,
    );
  }

  @Get(':hospitalId')
  getById(@Param('hospitalId') hospitalId: string) {
    return this.hospitalsService.getById(hospitalId);
  }

  @Get(':hospitalId/status')
  getStatus(@Param('hospitalId') hospitalId: string) {
    return this.hospitalsService.getStatus(hospitalId);
  }

  @Post(':hospitalId/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Hospital, UserRole.Admin)
  updateStatus(
    @Param('hospitalId') hospitalId: string,
    @Body() dto: UpdateOperationalStatusDto,
  ) {
    return this.hospitalsService.updateStatus(hospitalId, dto);
  }
}
