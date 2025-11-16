import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('Team')
@Controller('team')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeamController {
  constructor(private prisma: PrismaService) {}

  @Get('employees')
  @ApiOperation({ summary: 'قائمة الموظفين لأغراض الفريق (للمدير والمساعد)' })
  @ApiResponse({ status: 200, description: 'قائمة الموظفين' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getEmployees(@CurrentUser() user: any) {
    // If ADMIN: return all employees
    if (user.role === UserRole.ADMIN) {
      const employees = await this.prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          assistantId: true,
        },
      });
      return { employees };
    }

    // If MANAGER: return current user + team members only
    const manager = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        assistantId: true,
      },
    });

    const teamMembers = await this.prisma.user.findMany({
      where: { assistantId: user.id },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        assistantId: true,
      },
    });

    return {
      employees: [manager, ...teamMembers].filter(Boolean),
    };
  }
}


