import { Module } from '@nestjs/common';
import { BanksService } from './banks.service';
import { BanksController } from './banks.controller';
import { BankRatesController } from './bank-rates.controller';
import { BankRatesService } from './bank-rates.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UsersAdminController } from './users.controller';
import { InventoryController } from './inventory.controller';
import { FilesController } from './files.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BanksController, BankRatesController, UsersAdminController, InventoryController, FilesController],
  providers: [BanksService, BankRatesService],
  exports: [BanksService, BankRatesService],
})
export class AdminModule {}
