# 🔧 حل مشكلة الاتصال بقاعدة البيانات Supabase

## ⚠️ **المشكلة:**

المشروع يحتوي على migrations قديمة مبنية لـ **SQLite**، بينما الآن نريد استخدام **PostgreSQL** من Supabase.

### **الخطأ:**
```
P1001: Can't reach database server
```

هذا يعني أن Prisma لا يستطيع الوصول إلى قاعدة البيانات Supabase.

---

## ✅ **الحل:**

### **الخطوة 1: حدد DATABASE_URL الصحيح من Supabase**

1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك `crm-db`
3. اذهب إلى: **Settings → Database → Connection string**
4. انسخ **Connection URI** (النسخة الكاملة)

**مثال:**
```
postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres
```

### **الخطوة 2: أضف `?sslmode=require`**

Supabase يتطلب SSL للاتصال. لذلك أضف `?sslmode=require` في النهاية:

```
postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres?sslmode=require
```

### **الخطوة 3: تحديث `backend/.env`**

افتح `backend/.env` وضع:

```env
DATABASE_URL="postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres?sslmode=require"

JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

PORT=3000

NODE_ENV=production

CORS_ORIGIN=http://localhost:5173
```

### **الخطوة 4: تحقق من إعدادات Supabase**

1. اذهب إلى: **Settings → Database → Connection Pooling**
2. تأكد أن **Connection mode** = `Session` أو `Transaction`

### **الخطوة 5: احذف migrations القديمة**

```powershell
cd backend
Remove-Item -Path prisma/migrations -Recurse -Force
```

### **الخطوة 6: قم بإنشاء migrations جديدة**

```powershell
npx prisma migrate dev --name init
```

### **الخطوة 7: توليد Prisma Client**

```powershell
npx prisma generate
```

---

## 🔍 **المشاكل المحتملة:**

### **1. Authentication failed:**
- تأكد من أن كلمة المرور في `DATABASE_URL` صحيحة
- كلمة المرور موجودة في: **Settings → Database → Database password**

### **2. Can't reach database server:**
- تأكد من إضافة `?sslmode=require`
- تحقق من أن المشروع في Supabase **Active**
- جرب استخدام **Port 5432** أو **Port 6500**

### **3. Connection timeout:**
- تحقق من إعدادات Firewall في Supabase
- **Settings → Database → Network Restrictions**
- أضف IP الخاص بك أو أعد **Allow all IPs** مؤقتاً

---

## ✅ **التحقق من الاتصال:**

بعد تحديث `.env`، جرّب:

```powershell
cd backend
npx prisma db pull
```

إذا نجح، يعني الاتصال يعمل! ✅

---

## 📝 **ملاحظات:**

### **معلومات Supabase:**
- **Project URL**: `https://onyxkfdzbkbuxzwjcnho.supabase.co`
- **Database Host**: `db.onyxkfdzbkbuxzwjcnho.supabase.co`
- **Database Port**: `5432` (أو `6500`)
- **Database Name**: `postgres`
- **Database User**: `postgres`
- **Database Password**: موجود في Settings → Database

### **تشغيل Backend:**

```powershell
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run start
```

---

**📅 تاريخ:** 2025-02-11  
**✅ الحالة:** جاهز للتطبيق

