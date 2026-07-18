import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AppointmentsService } from './appointments.service';

@Controller('queues')
@UseGuards(AuthGuard)
export class QueueController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(':hospitalId')
  getQueue(@Param('hospitalId') hospitalId: string) {
    return this.appointmentsService.getQueueForHospital(hospitalId);
  }

  @Get(':hospitalId/departments/:departmentId')
  getDepartmentQueue(
    @Param('hospitalId') hospitalId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.appointmentsService.getQueueForHospital(hospitalId, departmentId);
  }
}
