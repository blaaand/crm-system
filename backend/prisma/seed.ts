import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء إدخال البيانات الأولية...');

  // إنشاء مستخدم إدمن افتراضي
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

  console.log('✅ تم إنشاء المستخدم الإداري:', admin.email);

  // إنشاء مدير
  const managerPassword = await bcrypt.hash('manager123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@crm.com' },
    update: {},
    create: {
      name: 'مدير المبيعات',
      email: 'manager@crm.com',
      passwordHash: managerPassword,
      role: 'MANAGER',
      phone: '+966501234568',
      active: true,
    },
  });

  console.log('✅ تم إنشاء المدير:', manager.email);

  // إنشاء مندوب مبيعات
  const agentPassword = await bcrypt.hash('agent123', 12);
  const agent = await prisma.user.upsert({
    where: { email: 'agent@crm.com' },
    update: {},
    create: {
      name: 'مندوب المبيعات',
      email: 'agent@crm.com',
      passwordHash: agentPassword,
      role: 'AGENT',
      phone: '+966501234569',
      active: true,
    },
  });

  console.log('✅ تم إنشاء مندوب المبيعات:', agent.email);

  // إنشاء بنوك افتراضية
  const banks = [
    { name: 'البنك الأهلي السعودي', code: 'NCB' },
    { name: 'بنك الراجحي', code: 'RJHI' },
    { name: 'البنك السعودي للاستثمار', code: 'SAIB' },
    { name: 'بنك ساب', code: 'SABB' },
    { name: 'البنك السعودي الفرنسي', code: 'BSF' },
    { name: 'بنك الإنماء', code: 'ANB' },
    { name: 'البنك السعودي الهولندي', code: 'SNB' },
    { name: 'بنك الجزيرة', code: 'JAZ' },
  ];

  for (const bankData of banks) {
    const bank = await prisma.bank.upsert({
      where: { name: bankData.name },
      update: {},
      create: {
        name: bankData.name,
        code: bankData.code,
        createdById: admin.id,
      },
    });
    console.log('✅ تم إنشاء البنك:', bank.name);
  }

  // إنشاء معادلات افتراضية
  const formulas = [
    {
      name: 'حساب نسبة الدخل المسموح',
      expression: 'salary * 0.3',
      description: 'حساب نسبة الدخل المسموح بها للتقسيط (30% من الراتب)',
    },
    {
      name: 'حساب الحد الأقصى للتقسيط',
      expression: 'salary * 0.3 - obligations',
      description: 'حساب الحد الأقصى لمبلغ التقسيط بعد خصم الالتزامات',
    },
    {
      name: 'حساب نسبة العمر',
      expression: 'age >= 21 && age <= 65 ? 1 : 0',
      description: 'التحقق من أن العمر مناسب للتقسيط',
    },
    {
      name: 'حساب نسبة الراتب للعمر',
      expression: 'salary / age',
      description: 'حساب نسبة الراتب للعمر',
    },
  ];

  for (const formulaData of formulas) {
    const formula = await prisma.formula.upsert({
      where: { name: formulaData.name },
      update: {},
      create: {
        name: formulaData.name,
        expression: formulaData.expression,
        description: formulaData.description,
        active: true,
        ownerId: admin.id,
      },
    });
    console.log('✅ تم إنشاء المعادلة:', formula.name);
  }

  // إنشاء عملاء افتراضيين
  const clients = [
    {
      name: 'أحمد محمد العلي',
      phonePrimary: '+966501234567',
      email: 'ahmed@example.com',
      city: 'الرياض',
      source: 'إعلان فيسبوك',
    },
    {
      name: 'فاطمة عبدالله السعد',
      phonePrimary: '+966501234568',
      email: 'fatima@example.com',
      city: 'جدة',
      source: 'إحالة',
    },
    {
      name: 'محمد سعد القحطاني',
      phonePrimary: '+966501234569',
      email: 'mohammed@example.com',
      city: 'الدمام',
      source: 'موقع إلكتروني',
    },
  ];

  for (const clientData of clients) {
    const existingClient = await prisma.client.findFirst({
      where: { phonePrimary: clientData.phonePrimary }
    });
    
    if (!existingClient) {
      const client = await prisma.client.create({
        data: {
          ...clientData,
          createdById: agent.id,
        },
      });
      console.log('✅ تم إنشاء العميل:', client.name);
    }
  }

  console.log('🎉 تم إدخال البيانات الأولية بنجاح!');
  console.log('\n📋 بيانات الدخول:');
  console.log('👑 الإدمن: admin@crm.com / admin123');
  console.log('👨‍💼 المدير: manager@crm.com / manager123');
  console.log('👨‍💻 المندوب: agent@crm.com / agent123');
}

main()
  .catch((e) => {
    console.error('❌ خطأ في إدخال البيانات الأولية:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
