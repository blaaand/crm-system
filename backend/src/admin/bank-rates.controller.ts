import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { BankRatesService } from './bank-rates.service'
import { CreateBankRateDto } from './dto/create-bank-rate.dto'
import { UpdateBankRateDto } from './dto/update-bank-rate.dto'

@ApiTags('Bank Rates')
@ApiBearerAuth()
@Controller('admin/bank-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class BankRatesController {
  constructor(private readonly bankRatesService: BankRatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update bank rate' })
  @ApiResponse({ status: 201, description: 'Bank rate created/updated successfully' })
  async upsertBankRate(@Body() createBankRateDto: CreateBankRateDto) {
    return this.bankRatesService.upsertBankRate(createBankRateDto)
  }

  @Put()
  @ApiOperation({ summary: 'Update bank rate (same as POST for upsert)' })
  @ApiResponse({ status: 200, description: 'Bank rate updated successfully' })
  async updateBankRate(@Body() updateBankRateDto: UpdateBankRateDto) {
    return this.bankRatesService.upsertBankRate(updateBankRateDto as CreateBankRateDto)
  }

  @Get('bank/:bankId')
  @ApiOperation({ summary: 'Get all rates for a specific bank' })
  @ApiResponse({ status: 200, description: 'Bank rates retrieved successfully' })
  async getBankRates(@Param('bankId') bankId: string) {
    return this.bankRatesService.getBankRates(bankId)
  }

  @Get('bank/:bankId/:employerType/:clientType')
  @ApiOperation({ summary: 'Get specific rate for bank, employer type, and client type' })
  @ApiResponse({ status: 200, description: 'Bank rate retrieved successfully' })
  async getSpecificRate(
    @Param('bankId') bankId: string,
    @Param('employerType') employerType: string,
    @Param('clientType') clientType: string,
  ) {
    return this.bankRatesService.getSpecificRate(bankId, employerType, clientType)
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a specific bank rate' })
  @ApiResponse({ status: 200, description: 'Bank rate deleted successfully' })
  async deleteBankRate(
    @Query('bankId') bankId: string,
    @Query('employerType') employerType: string,
    @Query('clientType') clientType: string,
  ) {
    return this.bankRatesService.deleteBankRate(bankId, employerType, clientType)
  }

  @Get('employer-types')
  @ApiOperation({ summary: 'Get available employer types' })
  @ApiResponse({ status: 200, description: 'Employer types retrieved successfully' })
  async getEmployerTypes() {
    return this.bankRatesService.getEmployerTypes()
  }

  @Get('client-types')
  @ApiOperation({ summary: 'Get available client types' })
  @ApiResponse({ status: 200, description: 'Client types retrieved successfully' })
  async getClientTypes() {
    return this.bankRatesService.getClientTypes()
  }
}
