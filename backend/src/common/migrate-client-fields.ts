import { PrismaService } from './prisma/prisma.service';

/**
 * Apply migration to add additionalData and commitments fields to clients table
 * This is safe to run multiple times - uses IF NOT EXISTS
 */
export async function migrateClientFields(prisma: PrismaService): Promise<void> {
  try {
    console.log('🔄 Checking for client fields migration...');
    
    // Try to add columns - PostgreSQL will ignore if they already exist
    // Using a try-catch for each column to handle errors gracefully
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "additionalData" TEXT'
      );
      console.log('✅ Added additionalData column (or already exists)');
    } catch (error: any) {
      if (error?.message?.includes('already exists') || error?.code === '42701') {
        console.log('✅ additionalData column already exists');
      } else {
        console.warn('⚠️ Could not add additionalData column:', error?.message);
      }
    }

    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "commitments" TEXT'
      );
      console.log('✅ Added commitments column (or already exists)');
    } catch (error: any) {
      if (error?.message?.includes('already exists') || error?.code === '42701') {
        console.log('✅ commitments column already exists');
      } else {
        console.warn('⚠️ Could not add commitments column:', error?.message);
      }
    }

    console.log('✅ Client fields migration check completed');
  } catch (error: any) {
    console.error('⚠️ Error in client fields migration:', error?.message || error);
    // Don't throw - allow server to start even if migration fails
    // The columns might already exist or migration will be handled by Prisma migrate
  }
}

