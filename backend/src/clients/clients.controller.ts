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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { BulkCreateClientsDto } from './dto/bulk-create-clients.dto';
import { CreateCommentDto } from '../requests/dto/create-comment.dto';

@ApiTags('Clients')
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء عميل جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء العميل بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  async create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.create(createClientDto, user.id);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'إنشاء عدة عملاء دفعة واحدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء العملاء بنجاح' })
  async bulkCreate(
    @Body() bulkCreateClientsDto: BulkCreateClientsDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.bulkCreate(bulkCreateClientsDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة العملاء' })
  @ApiResponse({ status: 200, description: 'قائمة العملاء' })
  async findAll(
    @Query() query: ClientQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.findAll(query, user.role, user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات العملاء' })
  @ApiResponse({ status: 200, description: 'إحصائيات العملاء' })
  async getStats(@CurrentUser() user: any) {
    return this.clientsService.getClientStats(user.role, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على تفاصيل العميل' })
  @ApiResponse({ status: 200, description: 'تفاصيل العميل' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.findOne(id, user.role, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث بيانات العميل' })
  @ApiResponse({ status: 200, description: 'تم تحديث العميل بنجاح' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لتعديل هذا العميل' })
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.update(id, updateClientDto, user.role, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'حذف العميل' })
  @ApiResponse({ status: 200, description: 'تم حذف العميل بنجاح' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لحذف هذا العميل' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.remove(id, user.role, user.id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'إضافة تعليق إلى العميل' })
  @ApiResponse({ status: 201, description: 'تم إضافة التعليق بنجاح' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  async addComment(
    @Param('id') id: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.addComment(id, createCommentDto.text, user.id);
  }
}
