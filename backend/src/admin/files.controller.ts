import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { Response } from 'express';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private prisma: PrismaService) {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'system-files');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة الملفات' })
  @ApiResponse({ status: 200, description: 'قائمة الملفات' })
  async getFiles(@CurrentUser() user: any) {
    const files = await this.prisma.systemFile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return files;
  }

  @Post('save')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'حفظ ملف في النظام' })
  @ApiResponse({ status: 201, description: 'تم حفظ الملف بنجاح' })
  async saveFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Body('fileType') fileType: string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('لم يتم رفع ملف');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'system-files');
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Save to database
    const systemFile = await this.prisma.systemFile.create({
      data: {
        name: name || file.originalname,
        filename: fileName,
        fileType: fileType || this.getFileType(file.mimetype),
        storagePath: filePath,
        mimeType: file.mimetype,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return systemFile;
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'تحميل ملف' })
  @ApiResponse({ status: 200, description: 'ملف' })
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    try {
      const file = await this.prisma.systemFile.findUnique({
        where: { id },
      });

      if (!file) {
        throw new NotFoundException('الملف غير موجود في قاعدة البيانات');
      }

      const storagePath = file.storagePath;
      const cwd = process.cwd();
      
      console.log('Download request:', { 
        fileId: id, 
        fileName: file.name, 
        storagePath, 
        cwd,
        exists: storagePath ? fs.existsSync(storagePath) : false 
      });

      if (!storagePath) {
        throw new NotFoundException('مسار الملف غير موجود في قاعدة البيانات');
      }

      if (!fs.existsSync(storagePath)) {
        // Try to find file in expected location
        const expectedPath = path.join(cwd, 'uploads', 'system-files', file.filename);
        if (fs.existsSync(expectedPath)) {
          // Update database with correct path
          await this.prisma.systemFile.update({
            where: { id },
            data: { storagePath: expectedPath },
          });
          
          const fileBuffer = fs.readFileSync(expectedPath);
          const fileName = encodeURIComponent(file.name);
          res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
          return res.send(fileBuffer);
        }
        
        throw new NotFoundException(`الملف غير موجود على الخادم. المسار: ${storagePath}`);
      }

      const fileBuffer = fs.readFileSync(storagePath);
      const fileName = encodeURIComponent(file.name);
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
      res.send(fileBuffer);
    } catch (error) {
      console.error('Error downloading file:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`تعذر تحميل الملف: ${error.message}`);
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'حذف ملف' })
  @ApiResponse({ status: 200, description: 'تم حذف الملف بنجاح' })
  async deleteFile(@Param('id') id: string, @CurrentUser() user: any) {
    const file = await this.prisma.systemFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('الملف غير موجود');
    }

    // Delete file from disk
    if (file.storagePath && fs.existsSync(file.storagePath)) {
      fs.unlinkSync(file.storagePath);
    }

    // Delete from database
    await this.prisma.systemFile.delete({
      where: { id },
    });

    return { message: 'تم حذف الملف بنجاح' };
  }

  private getFileType(mimeType: string): string {
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return 'excel';
    }
    if (mimeType.includes('pdf')) {
      return 'pdf';
    }
    if (mimeType.includes('image')) {
      return 'image';
    }
    return 'excel'; // default
  }
}

