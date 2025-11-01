import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFormulaDto {
  @ApiProperty({ example: 'حساب نسبة الدخل' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'salary * 0.3', description: 'التعبير الرياضي للمعادلة' })
  @IsString()
  expression: string;

  @ApiProperty({ example: 'معادلة لحساب نسبة الدخل المسموح بها للتقسيط', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
