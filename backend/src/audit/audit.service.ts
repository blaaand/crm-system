import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    actorId: string,
    actionType: string,
    targetType: string,
    targetId?: string,
    details?: any,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        actionType,
        targetType,
        targetId,
        details,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getLogs(
    targetType?: string,
    targetId?: string,
    actorId?: string,
    actionType?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (targetType) {
      where.targetType = targetType;
    }

    if (targetId) {
      where.targetId = targetId;
    }

    if (actorId) {
      where.actorId = actorId;
    }

    if (actionType) {
      where.actionType = actionType;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getLogsByTarget(targetType: string, targetId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        targetType,
        targetId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return logs;
  }

  async getAuditStats() {
    const [totalLogs, logsByAction, logsByTarget, recentLogs] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['actionType'],
        _count: {
          actionType: true,
        },
        orderBy: {
          _count: {
            actionType: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['targetType'],
        _count: {
          targetType: true,
        },
        orderBy: {
          _count: {
            targetType: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      totalLogs,
      logsByAction: logsByAction.map(item => ({
        actionType: item.actionType,
        count: item._count.actionType,
      })),
      logsByTarget: logsByTarget.map(item => ({
        targetType: item.targetType,
        count: item._count.targetType,
      })),
      recentLogs,
    };
  }
}
