import { IsInt, IsUUID, Min } from 'class-validator';

export class ReserveMedicineDto {
  @IsUUID()
  medicineId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
