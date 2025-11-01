import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) {}

  async create(createBankDto: CreateBankDto, userId: string) {
    const { name, code, notes } = createBankDto;

    // Check if bank with same name exists
    const existingBank = await this.prisma.bank.findFirst({
      where: {
        OR: [
          { name },
          ...(code ? [{ code }] : []),
        ],
      },
    });

    if (existingBank) {
      throw new ConflictException('البنك موجود بالفعل');
    }

    const bank = await this.prisma.bank.create({
      data: {
        name,
        code,
        notes,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            financingBankDetails: true,
          },
        },
      },
    });

    return bank;
  }

  async findAll() {
    const banks = await this.prisma.bank.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bankRates: {
          orderBy: [
            { employerType: 'asc' },
            { clientType: 'asc' }
          ]
        },
        _count: {
          select: {
            financingBankDetails: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return banks;
  }

  async findOne(id: string) {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bankRates: {
          orderBy: [
            { employerType: 'asc' },
            { clientType: 'asc' }
          ]
        },
        financingBankDetails: {
          include: {
            request: {
              select: {
                id: true,
                title: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            financingBankDetails: true,
          },
        },
      },
    });

    if (!bank) {
      throw new NotFoundException('البنك غير موجود');
    }

    return bank;
  }

  async update(id: string, updateBankDto: UpdateBankDto, userId: string) {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
    });

    if (!bank) {
      throw new NotFoundException('البنك غير موجود');
    }

    const { name, code } = updateBankDto;

    // Check if another bank with same name/code exists
    if (name || code) {
      const existingBank = await this.prisma.bank.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(name ? [{ name }] : []),
            ...(code ? [{ code }] : []),
          ],
        },
      });

      if (existingBank) {
        throw new ConflictException('البنك موجود بالفعل');
      }
    }

    const updatedBank = await this.prisma.bank.update({
      where: { id },
      data: updateBankDto,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            financingBankDetails: true,
          },
        },
      },
    });

    return updatedBank;
  }

  async remove(id: string) {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            financingBankDetails: true,
          },
        },
      },
    });

    if (!bank) {
      throw new NotFoundException('البنك غير موجود');
    }

    // Check if bank is used in any installment details
    if (bank._count.financingBankDetails > 0) {
      throw new ConflictException('لا يمكن حذف البنك لأنه مستخدم في طلبات التقسيط');
    }

    await this.prisma.bank.delete({
      where: { id },
    });

    return { message: 'تم حذف البنك بنجاح' };
  }

  async getBankStats() {
    const [totalBanks, banksWithUsage] = await Promise.all([
      this.prisma.bank.count(),
      this.prisma.bank.count({
        where: {
          financingBankDetails: {
            some: {},
          },
        },
      }),
    ]);

    const banksUsage = await this.prisma.bank.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            financingBankDetails: true,
          },
        },
      },
      orderBy: {
        financingBankDetails: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    return {
      totalBanks,
      banksWithUsage,
      banksWithoutUsage: totalBanks - banksWithUsage,
      topUsedBanks: banksUsage.map(bank => ({
        id: bank.id,
        name: bank.name,
        usageCount: 0, // bank._count.installmentBankDetails,
      })),
    };
  }
}
