import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { BulkCreateClientsDto } from './dto/bulk-create-clients.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto, userId: string) {
    const client = await this.prisma.client.create({
      data: {
        ...createClientDto,
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
            requests: true,
            attachments: true,
            comments: true,
          },
        },
      },
    });

    return client;
  }

  async bulkCreate(
    bulkCreateClientsDto: BulkCreateClientsDto,
    userId: string,
  ) {
    const sanitizePhone = (value: string) =>
      value.replace(/\s+/g, '').trim();
    const normalizePhone = (value: string) =>
      value.replace(/[^0-9]/g, '');

    const skipped: Array<{ index: number; reason: string }> = [];
    const processed = bulkCreateClientsDto.entries
      .map((entry, index) => {
        const name = entry.name?.trim() ?? '';
        const rawPhone = entry.phonePrimary ?? '';
        const sanitizedPhone = sanitizePhone(rawPhone);
        const normalizedPhone = normalizePhone(sanitizedPhone) || sanitizedPhone;

        if (!name) {
          skipped.push({ index, reason: 'الاسم فارغ' });
          return null;
        }

        if (!sanitizedPhone) {
          skipped.push({ index, reason: 'رقم الهاتف فارغ' });
          return null;
        }

        return {
          index,
          name,
          phonePrimary: sanitizedPhone,
          normalizedPhone,
          notes: entry.notes?.trim(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (processed.length === 0) {
      return {
        totalEntries: bulkCreateClientsDto.entries.length,
        createdCount: 0,
        createdClients: [],
        duplicates: [],
        skipped,
      };
    }

    const normalizedPhoneSet = processed.map((item) => item.normalizedPhone);

    const duplicatesMeta = new Map<
      string,
      { occurrences: number; indexes: number[] }
    >();

    for (const item of processed) {
      const meta = duplicatesMeta.get(item.normalizedPhone);
      if (meta) {
        meta.occurrences += 1;
        meta.indexes.push(item.index);
      } else {
        duplicatesMeta.set(item.normalizedPhone, {
          occurrences: 1,
          indexes: [item.index],
        });
      }
    }

    let existingClients: Array<{
      id: string;
      name: string;
      phonePrimary: string;
    }> = [];

    if (normalizedPhoneSet.length > 0) {
      const allCandidates = await this.prisma.client.findMany({
        select: {
          id: true,
          name: true,
          phonePrimary: true,
        },
      });

      const normalizedLookup = new Set(normalizedPhoneSet);
      existingClients = allCandidates.filter((candidate) =>
        normalizedLookup.has(normalizePhone(candidate.phonePrimary)),
      );
    }

    const existingByNormalized = new Map<
      string,
      { id: string; name: string; phonePrimary: string }[]
    >();
    for (const client of existingClients) {
      const key = normalizePhone(client.phonePrimary);
      const list = existingByNormalized.get(key) ?? [];
      list.push(client);
      existingByNormalized.set(key, list);
    }

    const duplicatePhones = new Set<string>();
    for (const [phone, meta] of duplicatesMeta.entries()) {
      if (meta.occurrences > 1) {
        duplicatePhones.add(phone);
      }
    }
    for (const phone of normalizedPhoneSet) {
      if (existingByNormalized.has(phone)) {
        duplicatePhones.add(phone);
      }
    }

    const createdClients = await this.prisma.$transaction(
      processed.map((item) =>
        this.prisma.client.create({
          data: {
            name: item.name,
            phonePrimary: item.phonePrimary,
            notes: item.notes,
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
                requests: true,
                attachments: true,
                comments: true,
              },
            },
          },
        }),
      ),
    );

    const duplicates = Array.from(duplicatePhones).map((phone) => ({
      phone,
      occurrences: duplicatesMeta.get(phone)?.occurrences ?? 1,
      indexes: duplicatesMeta.get(phone)?.indexes ?? [],
      existingClients: existingByNormalized.get(phone) ?? [],
    }));

    return {
      totalEntries: bulkCreateClientsDto.entries.length,
      createdCount: createdClients.length,
      createdClients,
      duplicates,
      skipped,
    };
  }

  async findAll(query: ClientQueryDto, userRole: UserRole, userId: string) {
    const { search, city, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phonePrimary: { contains: search } },
        { phoneSecondary: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    // For non-admin users, only show clients they created
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
      where.createdById = userId;
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
              requests: true,
              attachments: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userRole: UserRole, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requests: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            installmentDetails: {
              include: {
                salaryBank: true,
                financingBank: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { uploadedAt: 'desc' },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            attachments: true,
            requests: true,
            comments: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('العميل غير موجود');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      client.createdById !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لعرض هذا العميل');
    }

    return client;
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
    userRole: UserRole,
    userId: string,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('العميل غير موجود');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      client.createdById !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا العميل');
    }

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data: updateClientDto,
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
            requests: true,
            attachments: true,
            comments: true,
          },
        },
      },
    });

    return updatedClient;
  }

  async addComment(clientId: string, text: string, userId: string) {
    // Verify client exists
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('العميل غير موجود');
    }

    // Create comment and update client updatedAt in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create comment
      const comment = await tx.comment.create({
        data: {
          clientId,
          userId,
          text,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update client updatedAt to reflect the comment addition
      await tx.client.update({
        where: { id: clientId },
        data: {
          updatedAt: new Date(),
        },
      });

      return comment;
    });

    return result;
  }

  async remove(id: string, userRole: UserRole, userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('العميل غير موجود');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      client.createdById !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا العميل');
    }

    // Prevent deleting a client who still has requests
    const requestsCount = await this.prisma.request.count({ where: { clientId: id } });
    if (requestsCount > 0) {
      throw new BadRequestException('لا يمكن حذف العميل لأنه يمتلك طلبات. يرجى حذف الطلبات أولاً ثم إعادة المحاولة.');
    }

    await this.prisma.client.delete({ where: { id } });

    return { message: 'تم حذف العميل بنجاح' };
  }

  async getClientStats(userRole: UserRole, userId: string) {
    const where: any = {};

    // For non-admin users, only show stats for clients they created
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
      where.createdById = userId;
    }

    const [totalClients, clientsWithRequests, clientsByCity] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.count({
        where: {
          ...where,
          requests: {
            some: {},
          },
        },
      }),
      this.prisma.client.groupBy({
        by: ['city'],
        where,
        _count: {
          city: true,
        },
        orderBy: {
          _count: {
            city: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalClients,
      clientsWithRequests,
      clientsWithoutRequests: totalClients - clientsWithRequests,
      clientsByCity: clientsByCity.map(item => ({
        city: item.city || 'غير محدد',
        count: item._count.city,
      })),
    };
  }
}
