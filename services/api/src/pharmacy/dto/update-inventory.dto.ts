import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsUUID()
  medicineId: string;

  @IsInt()
  @Min(0)
  stockQuantity: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
