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
