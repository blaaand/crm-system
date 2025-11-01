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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Attachments')
@Controller('attachments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'رفع ملف مرفق' })
  @ApiResponse({ status: 201, description: 'تم رفع الملف بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة أو نوع ملف غير مدعوم' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Body('requestId') requestId?: string,
    @Body('clientId') clientId?: string,
  ) {
    return this.attachmentsService.uploadFile(file, user.id, requestId, clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على تفاصيل المرفق' })
  @ApiResponse({ status: 200, description: 'تفاصيل المرفق' })
  @ApiResponse({ status: 404, description: 'المرفق غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لعرض هذا المرفق' })
  async getAttachment(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.attachmentsService.getAttachment(id, user.id, user.role);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'تحميل المرفق' })
  @ApiResponse({ status: 200, description: 'رابط تحميل المرفق' })
  @ApiResponse({ status: 404, description: 'المرفق غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لتحميل هذا المرفق' })
  async downloadAttachment(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.attachmentsService.getSignedUrl(id, user.id, user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف المرفق' })
  @ApiResponse({ status: 200, description: 'تم حذف المرفق بنجاح' })
  @ApiResponse({ status: 404, description: 'المرفق غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لحذف هذا المرفق' })
  async deleteAttachment(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.attachmentsService.deleteAttachment(id, user.id, user.role);
  }

  @Get('request/:requestId')
  @ApiOperation({ summary: 'الحصول على مرفقات الطلب' })
  @ApiResponse({ status: 200, description: 'مرفقات الطلب' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لعرض مرفقات هذا الطلب' })
  async getAttachmentsByRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.attachmentsService.getAttachmentsByRequest(requestId, user.id, user.role);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'الحصول على مرفقات العميل' })
  @ApiResponse({ status: 200, description: 'مرفقات العميل' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لعرض مرفقات هذا العميل' })
  async getAttachmentsByClient(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
  ) {
    return this.attachmentsService.getAttachmentsByClient(clientId, user.id, user.role);
  }
}
