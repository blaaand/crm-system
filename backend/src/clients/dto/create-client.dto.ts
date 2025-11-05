import { IsString, IsEmail, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'أحمد محمد العلي' })
  @IsString()
  name: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  phonePrimary: string;

  @ApiProperty({ example: '+966501234568', required: false })
  @IsOptional()
  @IsString()
  phoneSecondary?: string;

  @ApiProperty({ example: 'ahmed@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'الرياض', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'شارع الملك فهد، الرياض', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'إعلان فيسبوك', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ example: 'عميل مهتم بشراء سيارة تويوتا', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'JSON string for storing additional client data' })
  @IsOptional()
  @IsString()
  additionalData?: string;

  @ApiProperty({ required: false, description: 'JSON string for storing client commitments' })
  @IsOptional()
  @IsString()
  commitments?: string;
}
