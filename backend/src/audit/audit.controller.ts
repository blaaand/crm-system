import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'الحصول على سجل النشاط' })
  @ApiResponse({ status: 200, description: 'سجل النشاط' })
  async getLogs(
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('actorId') actorId?: string,
    @Query('actionType') actionType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.auditService.getLogs(
      targetType,
      targetId,
      actorId,
      actionType,
      page,
      limit,
    );
  }

  @Get('target/:targetType/:targetId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'الحصول على سجل نشاط كائن محدد' })
  @ApiResponse({ status: 200, description: 'سجل نشاط الكائن' })
  async getLogsByTarget(
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
  ) {
    return this.auditService.getLogsByTarget(targetType, targetId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'إحصائيات سجل النشاط' })
  @ApiResponse({ status: 200, description: 'إحصائيات سجل النشاط' })
  async getStats() {
    return this.auditService.getAuditStats();
  }
}
