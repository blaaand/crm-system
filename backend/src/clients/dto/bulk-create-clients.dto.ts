import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class BulkClientEntryDto {
  @ApiProperty({ example: 'مشعل العامري' })
  @IsString()
  name: string;

  @ApiProperty({ example: '9660597560082' })
  @IsString()
  phonePrimary: string;

  @ApiProperty({
    required: false,
    description: 'Notes or extra context captured during import',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateClientsDto {
  @ApiProperty({
    type: [BulkClientEntryDto],
    description: 'List of clients to create in bulk',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkClientEntryDto)
  entries: BulkClientEntryDto[];
}

