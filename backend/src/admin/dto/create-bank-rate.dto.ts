import { IsString, IsNumber, IsIn, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateBankRateDto {
  @ApiProperty({
    description: 'Bank ID',
    example: 'uuid-bank-id'
  })
  @IsString()
  bankId: string

  @ApiProperty({
    description: 'Employer type',
    enum: ['PRIVATE', 'PRIVATE_UNACCREDITED', 'GOVERNMENT', 'MILITARY', 'RETIRED'],
    example: 'PRIVATE'
  })
  @IsString()
  @IsIn(['PRIVATE', 'PRIVATE_UNACCREDITED', 'GOVERNMENT', 'MILITARY', 'RETIRED'])
  employerType: string

  @ApiProperty({
    description: 'Client type',
    enum: ['TRANSFERRED', 'NON_TRANSFERRED'],
    example: 'TRANSFERRED'
  })
  @IsString()
  @IsIn(['TRANSFERRED', 'NON_TRANSFERRED'])
  clientType: string

  @ApiProperty({
    description: 'Interest rate percentage',
    example: 4.33,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number
}
