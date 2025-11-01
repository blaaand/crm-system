import { Controller, Get, Post, Body, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../common/prisma/prisma.service';
import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SaveInventoryDto {
  @ApiProperty({ example: ['اسم السيارة', 'اللون', 'السعر'] })
  @IsArray()
  @IsString({ each: true })
  headers!: string[];

  @ApiProperty({ example: [{ 'اسم السيارة': 'تويوتا', 'اللون': 'أبيض' }] })
  @IsArray()
  data!: Record<string, any>[];
}

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'الحصول على بيانات المخزون (متاح للجميع)' })
  @ApiResponse({ status: 200, description: 'بيانات المخزون' })
  async getInventory() {
    try {
      const inventory = await this.prisma.inventory.findFirst({
        orderBy: { updatedAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!inventory) {
        return { headers: [], data: [] };
      }

      return {
        headers: JSON.parse(inventory.headers),
        data: JSON.parse(inventory.data),
        uploadedBy: inventory.uploadedBy.name,
        updatedAt: inventory.updatedAt,
      };
    } catch (error: any) {
      // If table doesn't exist or any other error, return empty data
      console.error('Error loading inventory:', error);
      return { headers: [], data: [] };
    }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'حفظ بيانات المخزون (ADMIN و MANAGER فقط)' })
  @ApiResponse({ status: 201, description: 'تم حفظ المخزون بنجاح' })
  async saveInventory(@Body() dto: SaveInventoryDto, @CurrentUser() user: any) {
    try {
      // Delete old inventory if exists
      await this.prisma.inventory.deleteMany({});

      // Create new inventory
      const inventory = await this.prisma.inventory.create({
        data: {
          headers: JSON.stringify(dto.headers),
          data: JSON.stringify(dto.data),
          uploadedById: user.id,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        message: 'تم حفظ المخزون بنجاح',
        inventory: {
          headers: JSON.parse(inventory.headers),
          data: JSON.parse(inventory.data),
          uploadedBy: inventory.uploadedBy.name,
          updatedAt: inventory.updatedAt,
        },
      };
    } catch (error: any) {
      console.error('Error saving inventory:', error);
      throw new Error(error.message || 'حدث خطأ أثناء حفظ المخزون');
    }
  }

  @Delete()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'حذف بيانات المخزون (ADMIN و MANAGER فقط)' })
  @ApiResponse({ status: 200, description: 'تم حذف المخزون بنجاح' })
  async clearInventory() {
    await this.prisma.inventory.deleteMany({});
    return { message: 'تم حذف المخزون بنجاح' };
  }
}

