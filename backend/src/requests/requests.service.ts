import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { MoveRequestDto } from './dto/move-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestStatus } from '../common/enums/request-status.enum';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async create(createRequestDto: CreateRequestDto, userId: string) {
    const { clientId, installmentDetails, ...requestData } = createRequestDto;

    // Verify client exists
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('العميل غير موجود');
    }

    // Create request with transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: {
          ...requestData,
          clientId,
          createdById: userId,
          initialStatus: requestData.initialStatus || RequestStatus.AWAITING_CLIENT,
          currentStatus: requestData.initialStatus || RequestStatus.AWAITING_CLIENT,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phonePrimary: true,
              phoneSecondary: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create installment details if provided
      if (installmentDetails && createRequestDto.type === 'INSTALLMENT') {
        await tx.installmentDetails.create({
          data: {
            requestId: request.id,
            ...installmentDetails,
            obligationTypes: installmentDetails.obligationTypes ? JSON.stringify(installmentDetails.obligationTypes) : null,
          },
        });
      }

      // Create initial event
      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          fromStatus: null,
          toStatus: request.currentStatus,
          changedById: userId,
          comment: 'تم إنشاء الطلب',
        },
      });

      // Update client updatedAt when a request is created
      await tx.client.update({
        where: { id: clientId },
        data: {
          updatedAt: new Date(),
        },
      });

      return request;
    });

    return this.findOne(result.id, userId, UserRole.ADMIN);
  }

  async findAll(query: RequestQueryDto, userRole: UserRole, userId: string) {
    const { search, status, type, assignedToId, clientId, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { phonePrimary: { contains: search } } },
      ];
    }

    if (status) {
      where.currentStatus = status;
    }

    if (type) {
      where.type = type;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    // For non-admin users, only show requests they created or are assigned to
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
      where.OR = [
        { createdById: userId },
        { assignedToId: userId },
      ];
    }

    const [requests, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phonePrimary: true,
              phoneSecondary: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
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
          _count: {
            select: {
              attachments: true,
              comments: true,
              events: true,
            },
          },
        },
      }),
      this.prisma.request.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string, userRole: UserRole) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phonePrimary: true,
            phoneSecondary: true,
            email: true,
            city: true,
            address: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
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
        events: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      request.createdById !== userId &&
      request.assignedToId !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لعرض هذا الطلب');
    }

    return request;
  }

  async update(
    id: string,
    updateRequestDto: UpdateRequestDto,
    userId: string,
    userRole: UserRole,
  ) {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      request.createdById !== userId &&
      request.assignedToId !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا الطلب');
    }

    const { installmentDetails, ...requestData } = updateRequestDto;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.request.update({
        where: { id },
        data: requestData,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phonePrimary: true,
              phoneSecondary: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update installment details if provided
      if (installmentDetails && request.type === 'INSTALLMENT') {
        await tx.installmentDetails.upsert({
          where: { requestId: id },
          update: {
            ...installmentDetails,
            obligationTypes: installmentDetails.obligationTypes ? JSON.stringify(installmentDetails.obligationTypes) : null,
          },
          create: {
            requestId: id,
            ...installmentDetails,
            obligationTypes: installmentDetails.obligationTypes ? JSON.stringify(installmentDetails.obligationTypes) : null,
          },
        });
      }

      return updatedRequest;
    });

    return this.findOne(result.id, userId, userRole);
  }

  async move(id: string, moveRequestDto: MoveRequestDto, userId: string, userRole: UserRole) {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      request.createdById !== userId &&
      request.assignedToId !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لنقل هذا الطلب');
    }

    if (request.currentStatus === moveRequestDto.toStatus) {
      throw new BadRequestException('الطلب موجود بالفعل في هذه الحالة');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.request.update({
        where: { id },
        data: { currentStatus: moveRequestDto.toStatus },
      });

      // Create event record
      await tx.requestEvent.create({
        data: {
          requestId: id,
          fromStatus: request.currentStatus,
          toStatus: moveRequestDto.toStatus,
          changedById: userId,
          comment: moveRequestDto.comment || moveRequestDto.feedback,
        },
      });

      return updatedRequest;
    });

    return this.findOne(result.id, userId, userRole);
  }

  async addComment(requestId: string, text: string, userId: string) {
    // Verify request exists
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    // Create comment and update request updatedAt in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create comment
      const comment = await tx.comment.create({
        data: {
          requestId,
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

      // Update request updatedAt to reflect the comment addition
      await tx.request.update({
        where: { id: requestId },
        data: {
          updatedAt: new Date(),
        },
      });

      return comment;
    });

    return result;
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      request.createdById !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا الطلب');
    }

    // Get client ID before deleting request
    const clientId = request.clientId;

    // Delete request
    await this.prisma.request.delete({
      where: { id },
    });

    // Update client updatedAt when a request is deleted
    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        updatedAt: new Date(),
      },
    });

    return { message: 'تم حذف الطلب بنجاح' };
  }

  async getKanbanData(userRole: UserRole, userId: string) {
    const where: any = {};

    if (userRole === UserRole.ADMIN) {
      // Admin sees all requests
    } else if (userRole === UserRole.MANAGER) {
      // Manager sees own requests + team members' requests
      const teamMembers = await this.prisma.user.findMany({
        where: { assistantId: userId },
        select: { id: true },
      });
      const ids = [userId, ...teamMembers.map((m) => m.id)];
      where.OR = [
        { createdById: { in: ids } },
        { assignedToId: { in: ids } },
      ];
    } else {
      // Regular users: only their own requests
      where.OR = [
        { createdById: userId },
        { assignedToId: userId },
      ];
    }

    const requests = await this.prisma.request.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phonePrimary: true,
            phoneSecondary: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
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
        events: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            comment: true,
            createdAt: true,
            changedById: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1, // Only get the latest event
        },
        _count: {
          select: {
            attachments: true,
            comments: true,
            events: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Group requests by status
    const kanbanData = Object.values(RequestStatus).map(status => ({
      status,
      title: this.getStatusTitle(status),
      requests: requests.filter(request => request.currentStatus === status),
    }));

    return kanbanData;
  }

  async getRequestStats(userRole: UserRole, userId: string) {
    const where: any = {};

    if (userRole === UserRole.ADMIN) {
      // Admin sees stats for all requests
    } else if (userRole === UserRole.MANAGER) {
      // Manager sees stats for own requests + team members' requests
      const teamMembers = await this.prisma.user.findMany({
        where: { assistantId: userId },
        select: { id: true },
      });
      const ids = [userId, ...teamMembers.map((m) => m.id)];
      where.OR = [
        { createdById: { in: ids } },
        { assignedToId: { in: ids } },
      ];
    } else {
      // Regular users: only their own requests
      where.OR = [
        { createdById: userId },
        { assignedToId: userId },
      ];
    }

    const [totalRequests, requestsByStatus, requestsByType] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.groupBy({
        by: ['currentStatus'],
        where,
        _count: {
          currentStatus: true,
        },
      }),
      this.prisma.request.groupBy({
        by: ['type'],
        where,
        _count: {
          type: true,
        },
      }),
    ]);

    return {
      totalRequests,
      requestsByStatus: requestsByStatus.map(item => ({
        status: item.currentStatus,
        title: this.getStatusTitle(item.currentStatus),
        count: item._count.currentStatus,
      })),
      requestsByType: requestsByType.map(item => ({
        type: item.type,
        count: item._count.type,
      })),
    };
  }

  private getStatusTitle(status: string): string {
    const statusTitles = {
      [RequestStatus.NOT_ANSWERED]: 'عميل لم يتم الرد',
      [RequestStatus.AWAITING_CLIENT]: 'بانتظار رد العميل',
      [RequestStatus.FOLLOW_UP]: 'في المتابعة',
      [RequestStatus.AWAITING_DOCS]: 'بانتظار الأوراق',
      [RequestStatus.AWAITING_BANK_REP]: 'بانتظار رد مندوب البنك',
      [RequestStatus.SOLD]: 'تم البيع',
      [RequestStatus.NOT_SOLD]: 'لم يتم البيع',
    };

    return statusTitles[status] || status;
  }
}
