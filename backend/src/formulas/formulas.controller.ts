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
import { FormulasService } from './formulas.service';
import { CreateFormulaDto } from './dto/create-formula.dto';
import { UpdateFormulaDto } from './dto/update-formula.dto';
import { EvaluateFormulaDto } from './dto/evaluate-formula.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Formulas')
@Controller('formulas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FormulasController {
  constructor(private readonly formulasService: FormulasService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'إنشاء معادلة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المعادلة بنجاح' })
  @ApiResponse({ status: 409, description: 'المعادلة موجودة بالفعل' })
  @ApiResponse({ status: 400, description: 'تعبير المعادلة غير صحيح' })
  async create(
    @Body() createFormulaDto: CreateFormulaDto,
    @CurrentUser() user: any,
  ) {
    return this.formulasService.create(createFormulaDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة المعادلات' })
  @ApiResponse({ status: 200, description: 'قائمة المعادلات' })
  async findAll() {
    return this.formulasService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'الحصول على المعادلات المفعلة' })
  @ApiResponse({ status: 200, description: 'المعادلات المفعلة' })
  async findActive() {
    return this.formulasService.findActive();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'إحصائيات المعادلات' })
  @ApiResponse({ status: 200, description: 'إحصائيات المعادلات' })
  async getStats() {
    return this.formulasService.getFormulaStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على تفاصيل المعادلة' })
  @ApiResponse({ status: 200, description: 'تفاصيل المعادلة' })
  @ApiResponse({ status: 404, description: 'المعادلة غير موجودة' })
  async findOne(@Param('id') id: string) {
    return this.formulasService.findOne(id);
  }

  @Post(':id/evaluate')
  @ApiOperation({ summary: 'تنفيذ المعادلة' })
  @ApiResponse({ status: 200, description: 'نتيجة المعادلة' })
  @ApiResponse({ status: 404, description: 'المعادلة غير موجودة' })
  @ApiResponse({ status: 400, description: 'فشل في تنفيذ المعادلة' })
  async evaluate(
    @Param('id') id: string,
    @Body() evaluateFormulaDto: EvaluateFormulaDto,
  ) {
    return this.formulasService.evaluate(id, evaluateFormulaDto);
  }

  @Post('evaluate/:name')
  @ApiOperation({ summary: 'تنفيذ المعادلة بالاسم' })
  @ApiResponse({ status: 200, description: 'نتيجة المعادلة' })
  @ApiResponse({ status: 404, description: 'المعادلة غير موجودة' })
  @ApiResponse({ status: 400, description: 'فشل في تنفيذ المعادلة' })
  async evaluateByName(
    @Param('name') name: string,
    @Body() variables: Record<string, any>,
  ) {
    return this.formulasService.evaluateByName(name, variables);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'تحديث المعادلة' })
  @ApiResponse({ status: 200, description: 'تم تحديث المعادلة بنجاح' })
  @ApiResponse({ status: 404, description: 'المعادلة غير موجودة' })
  @ApiResponse({ status: 409, description: 'المعادلة موجودة بالفعل' })
  @ApiResponse({ status: 400, description: 'تعبير المعادلة غير صحيح' })
  async update(
    @Param('id') id: string,
    @Body() updateFormulaDto: UpdateFormulaDto,
    @CurrentUser() user: any,
  ) {
    return this.formulasService.update(id, updateFormulaDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'حذف المعادلة' })
  @ApiResponse({ status: 200, description: 'تم حذف المعادلة بنجاح' })
  @ApiResponse({ status: 404, description: 'المعادلة غير موجودة' })
  async remove(@Param('id') id: string) {
    return this.formulasService.remove(id);
  }
}
