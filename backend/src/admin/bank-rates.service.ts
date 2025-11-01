import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateBankRateDto } from './dto/create-bank-rate.dto'

@Injectable()
export class BankRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBankRate(createBankRateDto: CreateBankRateDto) {
    const { bankId, employerType, clientType, rate } = createBankRateDto

    // Verify bank exists
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId }
    })

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${bankId} not found`)
    }

    // Validate rate
    if (rate < 0 || rate > 100) {
      throw new BadRequestException('Rate must be between 0 and 100')
    }

    // Upsert the rate
    const bankRate = await this.prisma.bankRate.upsert({
      where: {
        bankId_employerType_clientType: {
          bankId,
          employerType,
          clientType,
        }
      },
      update: {
        rate,
        updatedAt: new Date(),
      },
      create: {
        bankId,
        employerType,
        clientType,
        rate,
      },
    })

    return bankRate
  }

  async getBankRates(bankId: string) {
    // Verify bank exists
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId }
    })

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${bankId} not found`)
    }

    const rates = await this.prisma.bankRate.findMany({
      where: { bankId },
      orderBy: [
        { employerType: 'asc' },
        { clientType: 'asc' }
      ]
    })

    return rates
  }

  async getSpecificRate(bankId: string, employerType: string, clientType: string) {
    const rate = await this.prisma.bankRate.findUnique({
      where: {
        bankId_employerType_clientType: {
          bankId,
          employerType,
          clientType,
        }
      }
    })

    if (!rate) {
      throw new NotFoundException(
        `Rate not found for bank ${bankId}, employer type ${employerType}, client type ${clientType}`
      )
    }

    return rate
  }

  async deleteBankRate(bankId: string, employerType: string, clientType: string) {
    const rate = await this.prisma.bankRate.findUnique({
      where: {
        bankId_employerType_clientType: {
          bankId,
          employerType,
          clientType,
        }
      }
    })

    if (!rate) {
      throw new NotFoundException('Bank rate not found')
    }

    await this.prisma.bankRate.delete({
      where: {
        bankId_employerType_clientType: {
          bankId,
          employerType,
          clientType,
        }
      }
    })

    return { message: 'Bank rate deleted successfully' }
  }

  async getEmployerTypes() {
    return [
      { id: 'PRIVATE', name: 'خاص', nameEn: 'Private' },
      { id: 'PRIVATE_UNACCREDITED', name: 'خاص غير معتمد', nameEn: 'Private Unaccredited' },
      { id: 'GOVERNMENT', name: 'حكومي', nameEn: 'Government' },
      { id: 'MILITARY', name: 'عسكري', nameEn: 'Military' },
      { id: 'RETIRED', name: 'متقاعد', nameEn: 'Retired' },
    ]
  }

  async getClientTypes() {
    return [
      { id: 'TRANSFERRED', name: 'عميل محول', nameEn: 'Transferred Client', description: 'راتبه ينزل على البنك' },
      { id: 'NON_TRANSFERRED', name: 'عميل غير محول', nameEn: 'Non-Transferred Client', description: 'راتبه ينزل على بنك آخر' },
    ]
  }
}
