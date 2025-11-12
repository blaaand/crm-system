import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'نص التعليق' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ required: false, description: 'معرف الطلب' })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiProperty({ required: false, description: 'معرف العميل' })
  @IsOptional()
  @IsString()
  clientId?: string;
}

