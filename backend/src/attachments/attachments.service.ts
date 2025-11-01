import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class AttachmentsService {
  private s3: AWS.S3;

  constructor(private prisma: PrismaService) {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    requestId?: string,
    clientId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('لم يتم رفع أي ملف');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('نوع الملف غير مدعوم');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('حجم الملف كبير جداً (الحد الأقصى 10MB)');
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `attachments/${fileName}`;

    try {
      // Upload to S3
      const uploadResult = await this.s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'private',
        })
        .promise();

      // Save to database
      const attachment = await this.prisma.attachment.create({
        data: {
          filename: file.originalname,
          storagePath: uploadResult.Key,
          mimeType: file.mimetype,
          requestId,
          clientId,
          uploadedById: userId,
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

      return attachment;
    } catch (error) {
      throw new BadRequestException('فشل في رفع الملف');
    }
  }

  async getAttachment(id: string, userId: string, userRole: UserRole) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        request: {
          select: {
            id: true,
            title: true,
            createdById: true,
            assignedToId: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            createdById: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('المرفق غير موجود');
    }

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      attachment.uploadedById !== userId &&
      !this.canAccessAttachment(attachment, userId, userRole)
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لعرض هذا المرفق');
    }

    return attachment;
  }

  async getSignedUrl(id: string, userId: string, userRole: UserRole) {
    const attachment = await this.getAttachment(id, userId, userRole);

    try {
      const signedUrl = this.s3.getSignedUrl('getObject', {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: attachment.storagePath,
        Expires: 3600, // 1 hour
      });

      return {
        url: signedUrl,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
      };
    } catch (error) {
      throw new BadRequestException('فشل في إنشاء رابط التحميل');
    }
  }

  async deleteAttachment(id: string, userId: string, userRole: UserRole) {
    const attachment = await this.getAttachment(id, userId, userRole);

    try {
      // Delete from S3
      await this.s3
        .deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: attachment.storagePath,
        })
        .promise();

      // Delete from database
      await this.prisma.attachment.delete({
        where: { id },
      });

      return { message: 'تم حذف المرفق بنجاح' };
    } catch (error) {
      throw new BadRequestException('فشل في حذف المرفق');
    }
  }

  async getAttachmentsByRequest(requestId: string, userId: string, userRole: UserRole) {
    // Verify request exists and user has access
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      request.createdById !== userId &&
      request.assignedToId !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لعرض مرفقات هذا الطلب');
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { requestId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return attachments;
  }

  async getAttachmentsByClient(clientId: string, userId: string, userRole: UserRole) {
    // Verify client exists and user has access
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('العميل غير موجود');
    }

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      client.createdById !== userId
    ) {
      throw new ForbiddenException('ليس لديك صلاحية لعرض مرفقات هذا العميل');
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { clientId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        request: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return attachments;
  }

  private canAccessAttachment(attachment: any, userId: string, userRole: UserRole): boolean {
    // Check if user can access through request
    if (attachment.request) {
      return (
        attachment.request.createdById === userId ||
        attachment.request.assignedToId === userId
      );
    }

    // Check if user can access through client
    if (attachment.client) {
      return attachment.client.createdById === userId;
    }

    return false;
  }
}
