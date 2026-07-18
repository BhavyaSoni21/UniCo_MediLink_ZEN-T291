import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class ScheduleSlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(HHMM, { message: 'startTime must be HH:MM (24h)' })
  startTime: string;

  @IsString()
  @Matches(HHMM, { message: 'endTime must be HH:MM (24h)' })
  endTime: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  slotDurationMinutes?: number;
}
