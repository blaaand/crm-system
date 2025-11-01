import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Admin - Banks')
@Controller('admin/banks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'إنشاء بنك جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء البنك بنجاح' })
  @ApiResponse({ status: 409, description: 'البنك موجود بالفعل' })
  async create(
    @Body() createBankDto: CreateBankDto,
    @CurrentUser() user: any,
  ) {
    return this.banksService.create(createBankDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة البنوك' })
  @ApiResponse({ status: 200, description: 'قائمة البنوك' })
  async findAll() {
    return this.banksService.findAll();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'إحصائيات البنوك' })
  @ApiResponse({ status: 200, description: 'إحصائيات البنوك' })
  async getStats() {
    return this.banksService.getBankStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على تفاصيل البنك' })
  @ApiResponse({ status: 200, description: 'تفاصيل البنك' })
  @ApiResponse({ status: 404, description: 'البنك غير موجود' })
  async findOne(@Param('id') id: string) {
    return this.banksService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'تحديث بيانات البنك' })
  @ApiResponse({ status: 200, description: 'تم تحديث البنك بنجاح' })
  @ApiResponse({ status: 404, description: 'البنك غير موجود' })
  @ApiResponse({ status: 409, description: 'البنك موجود بالفعل' })
  async update(
    @Param('id') id: string,
    @Body() updateBankDto: UpdateBankDto,
    @CurrentUser() user: any,
  ) {
    return this.banksService.update(id, updateBankDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'حذف البنك' })
  @ApiResponse({ status: 200, description: 'تم حذف البنك بنجاح' })
  @ApiResponse({ status: 404, description: 'البنك غير موجود' })
  @ApiResponse({ status: 409, description: 'لا يمكن حذف البنك لأنه مستخدم في طلبات التقسيط' })
  async remove(@Param('id') id: string) {
    return this.banksService.remove(id);
  }
}
