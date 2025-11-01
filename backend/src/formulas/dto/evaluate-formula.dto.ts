import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EvaluateFormulaDto {
  @ApiProperty({ 
    example: { salary: 5000, age: 30, obligations: 1000 },
    description: 'قيم المتغيرات للمعادلة'
  })
  @IsObject()
  variables: Record<string, any>;
}
