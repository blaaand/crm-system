const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating admin user...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      name: 'مدير النظام',
      email: 'admin@crm.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      phone: '+966501234567',
      active: true,
    },
  });

  console.log('✅ Admin created successfully!');
  console.log('📧 Email: admin@crm.com');
  console.log('🔑 Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

