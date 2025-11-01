import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class CreateInstallmentDetailsDto {
  @ApiProperty({
    description: 'Car name',
    example: 'تويوتا كامري 2024',
    required: false
  })
  @IsOptional()
  @IsString()
  carName?: string

  @ApiProperty({
    description: 'Car base price',
    example: 50000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  carPrice?: number

  @ApiProperty({
    description: 'Additional fees',
    example: 2000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  additionalFees?: number

  @ApiProperty({
    description: 'Shipping fees (الشحن)',
    example: 800,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  shipping?: number

  @ApiProperty({
    description: 'Registration fees (التجيير)',
    example: 1500,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  registration?: number

  @ApiProperty({
    description: 'Other additions',
    example: 500,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  otherAdditions?: number

  @ApiProperty({
    description: 'Plate number fees (اللوح)',
    example: 1200,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  plateNumber?: number

  @ApiProperty({
    description: 'Work organization (جهة العمل)',
    example: 'PRIVATE_APPROVED',
    required: false
  })
  @IsOptional()
  @IsString()
  workOrganization?: string

  @ApiProperty({
    description: 'Client age',
    example: 35,
    required: false
  })
  @IsOptional()
  @IsNumber()
  age?: number

  @ApiProperty({
    description: 'Salary bank ID',
    example: 'bank-uuid',
    required: false
  })
  @IsOptional()
  @IsString()
  salaryBankId?: string

  @ApiProperty({
    description: 'Monthly salary',
    example: 8000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  salary?: number

  @ApiProperty({
    description: 'Obligation types',
    example: ['عقاري مدعوم', 'شخصي'],
    required: false
  })
  @IsOptional()
  @IsArray()
  obligationTypes?: string[]

  @ApiProperty({
    description: 'Deduction percentage',
    example: 33.5,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  deductionPercentage?: number

  @ApiProperty({
    description: 'Obligation 1 amount',
    example: 1000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  obligation1?: number

  @ApiProperty({
    description: 'Obligation 2 amount',
    example: 500,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  obligation2?: number

  @ApiProperty({
    description: 'Visa amount',
    example: 2000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  visaAmount?: number

  @ApiProperty({
    description: 'Insurance percentage',
    example: 5.5,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  insurancePercentage?: number

  @ApiProperty({
    description: 'Has service stop',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  hasServiceStop?: boolean

  @ApiProperty({
    description: 'Financing bank ID',
    example: 'bank-uuid',
    required: false
  })
  @IsOptional()
  @IsString()
  financingBankId?: string

  @ApiProperty({
    description: 'Down payment percentage',
    example: 15.0,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  downPaymentPercentage?: number

  @ApiProperty({
    description: 'Final payment percentage',
    example: 10.0,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  finalPaymentPercentage?: number

  @ApiProperty({
    description: 'Profit margin percentage',
    example: 7.5,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  profitMargin?: number

  @ApiProperty({
    description: 'Installment months',
    example: 60,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  installmentMonths?: number

  @ApiProperty({
    description: 'Deducted amount',
    example: 2500.0,
    required: false
  })
  @IsOptional()
  @IsNumber()
  deductedAmount?: number

  @ApiProperty({
    description: 'Final amount after obligations',
    example: 1800.0,
    required: false
  })
  @IsOptional()
  @IsNumber()
  finalAmount?: number
}
