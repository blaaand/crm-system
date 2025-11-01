import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

class CreateEmployeeDto {
  @ApiProperty({ example: 'أحمد محمد' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '0501234567' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.AGENT })
  @IsEnum(UserRole)
  role!: UserRole;
}

class UpdateEmployeeDto {
  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
export class UsersAdminController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List users (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Users list' })
  async list() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        lastLogin: true,
        createdAt: true,
      },
    })
    return { users }
  }

  @Post()
  @ApiOperation({ summary: 'Create employee user (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(@Body() dto: CreateEmployeeDto) {
    const { name, phone, password, role } = dto

    const existingByPhone = await this.prisma.user.findFirst({ where: { phone } })
    if (existingByPhone) {
      throw new Error('المستخدم موجود بالفعل بهذا الجوال')
    }

    // Generate email placeholder from phone to satisfy unique email constraint
    const email = `${phone}@crm.local`
    const existingByEmail = await this.prisma.user.findUnique({ where: { email } })
    if (existingByEmail) {
      throw new Error('هناك تعارض في البريد الإلكتروني')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await this.prisma.user.create({
      data: {
        name,
        phone,
        email,
        passwordHash,
        role,
        active: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return { user }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee (role/active)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const data: any = {}
    if (dto.role) data.role = dto.role
    if (typeof dto.active === 'boolean') data.active = dto.active
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        lastLogin: true,
        createdAt: true,
      },
    })
    return { user }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee user (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async delete(@Param('id') id: string) {
    await this.prisma.user.delete({
      where: { id },
    })
    return { message: 'تم حذف الموظف بنجاح' }
  }
}


