import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBankDto {
  @ApiProperty({ example: 'البنك الأهلي السعودي' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'NCB', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'ملاحظات خاصة بالبنك', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
