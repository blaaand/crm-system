import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { RequestsModule } from './requests/requests.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AdminModule } from './admin/admin.module';
import { FormulasModule } from './formulas/formulas.module';
import { AuditModule } from './audit/audit.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL) || 60,
        limit: parseInt(process.env.THROTTLE_LIMIT) || 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    ClientsModule,
    RequestsModule,
    AttachmentsModule,
    AdminModule,
    FormulasModule,
    AuditModule,
    TeamModule,
  ],
})
export class AppModule {}
