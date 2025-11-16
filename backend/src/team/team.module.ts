import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TeamController } from './team.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TeamController],
})
export class TeamModule {}


