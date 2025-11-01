import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, IsUUID, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RequestType } from '../../common/enums/request-type.enum';
import { CreateInstallmentDetailsDto } from './create-installment-details.dto';
import { RequestStatus } from '../../common/enums/request-status.enum';
import { EmployerType } from '../../common/enums/employer-type.enum';

enum ObligationType {
  PERSONAL = 'PERSONAL',
  REAL_ESTATE_SUPPORTED = 'REAL_ESTATE_SUPPORTED',
  REAL_ESTATE_UNSUPPORTED = 'REAL_ESTATE_UNSUPPORTED',
}

export class ObligationDto {
  @ApiProperty({ enum: ObligationType })
  @IsEnum(ObligationType)
  type: ObligationType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  amount: number;
}


export class CreateRequestDto {
  @ApiProperty()
  @IsUUID()
  clientId: string;

  @ApiProperty({ example: 'طلب سيارة تويوتا كامري 2024' })
  @IsString()
  title: string;

  @ApiProperty({ enum: RequestType })
  @IsEnum(RequestType)
  type: RequestType;

  @ApiProperty({ enum: RequestStatus, required: false })
  @IsOptional()
  @IsEnum(RequestStatus)
  initialStatus?: RequestStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false, description: 'JSON string for custom fields like cash details' })
  @IsOptional()
  @IsString()
  customFields?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInstallmentDetailsDto)
  installmentDetails?: CreateInstallmentDetailsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  carName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasServiceStop?: boolean;
}
