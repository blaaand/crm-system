import { PartialType } from '@nestjs/swagger'
import { CreateBankRateDto } from './create-bank-rate.dto'

export class UpdateBankRateDto extends PartialType(CreateBankRateDto) {}
