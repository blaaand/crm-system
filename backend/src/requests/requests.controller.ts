import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { MoveRequestDto } from './dto/move-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Requests')
@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء طلب جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  async create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.create(createRequestDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة الطلبات' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات' })
  async findAll(
    @Query() query: RequestQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.findAll(query, user.role, user.id);
  }

  @Get('kanban')
  @ApiOperation({ summary: 'الحصول على بيانات لوحة Kanban' })
  @ApiResponse({ status: 200, description: 'بيانات لوحة Kanban' })
  async getKanbanData(@CurrentUser() user: any) {
    return this.requestsService.getKanbanData(user.role, user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات الطلبات' })
  @ApiResponse({ status: 200, description: 'إحصائيات الطلبات' })
  async getStats(@CurrentUser() user: any) {
    return this.requestsService.getRequestStats(user.role, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على تفاصيل الطلب' })
  @ApiResponse({ status: 200, description: 'تفاصيل الطلب' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث بيانات الطلب' })
  @ApiResponse({ status: 200, description: 'تم تحديث الطلب بنجاح' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لتعديل هذا الطلب' })
  async update(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.update(id, updateRequestDto, user.id, user.role);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'نقل الطلب إلى حالة أخرى' })
  @ApiResponse({ status: 200, description: 'تم نقل الطلب بنجاح' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لنقل هذا الطلب' })
  @ApiResponse({ status: 400, description: 'الطلب موجود بالفعل في هذه الحالة' })
  async move(
    @Param('id') id: string,
    @Body() moveRequestDto: MoveRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.move(id, moveRequestDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'حذف الطلب' })
  @ApiResponse({ status: 200, description: 'تم حذف الطلب بنجاح' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لحذف هذا الطلب' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.remove(id, user.id, user.role);
  }
}
