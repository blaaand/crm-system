# نظام إدارة العملاء والطلبات (CRM System)

نظام شامل لإدارة العملاء والطلبات مع لوحة Kanban للطلبات.

## المميزات الرئيسية

- 🏢 إدارة العملاء والطلبات
- 📋 لوحة Kanban تفاعلية
- 💰 دعم طلبات الكاش والتقسيط
- 📊 إدارة المخزون
- 📁 إدارة الملفات
- 🔐 نظام صلاحيات متقدم
- 📝 تتبع التغييرات والسجلات

## البدء السريع

### التطوير المحلي

1. **تشغيل Backend**:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run start:dev
   ```

2. **تشغيل Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### الرفع على Render

انظر [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) للحصول على دليل خطوة بخطوة.

## البنية

```
crm-system/
├── backend/          # NestJS Backend
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/         # React + Vite Frontend
│   ├── src/
│   └── package.json
└── render.yaml       # Render deployment config
```

## المتطلبات

- Node.js 18+
- PostgreSQL (للإنتاج) أو SQLite (للتطوير)
- npm أو yarn

## البيئة

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- API Docs: `http://localhost:3000/api/docs`

## الرخصة

MIT
