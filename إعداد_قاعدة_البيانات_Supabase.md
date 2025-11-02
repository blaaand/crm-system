# 🗄️ دليل إعداد قاعدة البيانات Supabase

## ✅ **ما تم إنجازه:**

### ✓ **الخطوة 1: إنشاء ملف .env**
تم إنشاء ملف `.env` في مجلد `backend` مع القالب التالي:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173
```

### ✓ **الخطوة 2: تثبيت التبعيات**
تم تنفيذ `npm install` بنجاح:
- ✅ تم تثبيت 835 حزمة
- ✅ تم توليد Prisma Client تلقائياً
- ✅ جميع التبعيات جاهزة

---

## ⚠️ **ما تحتاج إنجازه:**

### 🔑 **الخطوة 3: تحديث كلمة مرور Supabase**

ملف `.env` الحالي يحتوي على `YOUR_PASSWORD` كـ placeholder. 
تحتاج استبدالها بكلمة مرور Supabase الفعلية.

#### 📝 **كيفية الحصول على كلمة مرور Supabase:**

1. اذهب إلى: https://supabase.com/dashboard
2. افتح مشروعك: `crm-db`
3. اذهب إلى: **Project Settings** → **Database**
4. في قسم **Connection string**:
   - اختر **URI**
   - ستجد رابط مثل:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres
     ```
   - **انسخ كلمة المرور** من بين `:` و `@`

#### 🔐 **تحديث ملف .env:**

1. افتح `backend/.env`
2. استبدل `YOUR_PASSWORD` بكلمة المرور الفعلية
3. احفظ الملف

**مثال:**
```env
# قبل
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres

# بعد (كلمة المرور الفعلية)
DATABASE_URL=postgresql://postgres:01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres
```

---

## 🔧 **الخطوة 4: تنفيذ Migrations**

بعد تحديث كلمة المرور، نفّذ:

```bash
cd backend
npx prisma migrate deploy
```

**هذا الأمر سيقوم بـ:**
- ✓ الاتصال بقاعدة البيانات Supabase
- ✓ إنشاء جميع الجداول (users, clients, requests, وغيرها)
- ✓ تطبيق جميع migrations

**متوقع أن ترى:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

Applying migration `20251101113937_init`

The following migration(s) have been applied:

migrations/
  └─ 20251101113937_init/
    └─ migration.sql

Your database is now in sync with your Prisma schema.
```

---

## 🔑 **الخطوة 5: إنشاء JWT_SECRET قوي (اختياري)**

للمزيد من الأمان، أنشئ JWT_SECRET قوي:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

ثم استبدل في `.env`:
```env
JWT_SECRET=الجلسة_الطولى_العشوائية_هنا
```

---

## ✅ **الخطوة 6: التحقق من الاتصال**

اختبر الاتصال بقاعدة البيانات:

```bash
cd backend
npm run start:dev
```

**إذا نجح:**
- ✅ ستفتح: http://localhost:3000
- ✅ API Docs: http://localhost:3000/api/docs
- ✅ لا توجد أخطاء في Terminal

**إذا فشل:**
- ❌ تحقق من كلمة المرور في `.env`
- ❌ تحقق من أن Supabase Project يعمل
- ❌ تحقق من أن Connection String صحيح

---

## 📊 **معلومات قاعدة البيانات Supabase:**

### **Project Name:**
```
crm-db
```

### **Connection Details:**
```
Host: db.onyxkfdzbkbuxzwjcnho.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [كلمة مرورك]
```

### **Dashboard URL:**
```
https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]
```

---

## 🔍 **استكشاف الأخطاء:**

### ❌ **خطأ: "password authentication failed"**

**الحل:**
1. تأكد من نسخ كلمة المرور بشكل صحيح
2. لا توجد مسافات زائدة في `.env`
3. جرب نسخ Connection String بالكامل من Supabase

### ❌ **خطأ: "connection refused"**

**الحل:**
1. تحقق من أن Supabase Project يعمل (Status: Active)
2. تحقق من عنوان IP الخاص بك (قد تحتاج إضافة IP إلى whitelist)

### ❌ **خطأ: "relation does not exist"**

**الحل:**
1. تأكد من تنفيذ `npx prisma migrate deploy`
2. تحقق من وجود migrations في `backend/prisma/migrations/`

---

## ✅ **قائمة التحقق:**

- [ ] تم تحديث `DATABASE_URL` بكلمة المرور الصحيحة
- [ ] تم تنفيذ `npx prisma migrate deploy`
- [ ] جميع الجداول تم إنشاؤها بنجاح
- [ ] تم إنشاء JWT_SECRET قوي
- [ ] الـ Backend يعمل بدون أخطاء
- [ ] API Docs تفتح بنجاح

---

## 🚀 **الخطوة التالية:**

بعد التأكد من عمل قاعدة البيانات:

1. **إنشاء مستخدم Admin** عبر Swagger UI
2. **رفع Backend** على Railway
3. **ربط Frontend** بـ Backend

---

## 📚 **مراجع:**

- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Environment Variables](https://www.prisma.io/docs/concepts/overview/environment-variables)

---

**📅 تاريخ التحديث:** 2025-02-11  
**✅ الحالة:** جاهز للتطبيق

