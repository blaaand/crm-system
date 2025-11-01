# 🚂 دليل رفع المشروع على Railway

## 📋 المتطلبات الأساسية

1. حساب على [railway.app](https://railway.app)
2. GitHub repository (تم بالفعل ✅)
3. حساب Supabase للـ Database (أو استخدام Railway PostgreSQL)

---

## 🚀 الخطوة 1: إنشاء PostgreSQL Database

### الخيار A: استخدام Supabase (مجاني دائماً) - موصى به

1. اذهب إلى [supabase.com](https://supabase.com)
2. سجّل دخول وأنشئ Project جديد
3. اذهب إلى **Project Settings** → **Database**
4. انسخ **Connection String** (URI)
   - مثال: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

### الخيار B: استخدام Railway PostgreSQL

1. في Railway Dashboard، اضغط **+ New** → **Database** → **Add PostgreSQL**
2. Railway سيقوم بإنشاء Database تلقائياً
3. ستجد `DATABASE_URL` في **Variables** tab

---

## 🚀 الخطوة 2: إنشاء Backend Service

### 1. إنشاء Service:
1. في Railway Dashboard، اضغط **+ New** → **GitHub Repo**
2. اختر Repository: `crm-system`
3. Railway سيقوم بإنشاء Service تلقائياً

### 2. إعدادات Build:

**Root Directory**: `backend`

**Build Command** (إذا لم يتم اكتشافه تلقائياً):
```bash
npm install && npx prisma generate && npm run build
```

**Start Command**:
```bash
npx prisma migrate deploy && npm run start:prod
```

### 3. Environment Variables:

في **Variables** tab، أضف:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `<من Supabase أو Railway PostgreSQL>` |
| `JWT_SECRET` | `<أنشئ مفتاح سري>` |
| `CORS_ORIGIN` | `<سيتم إضافته بعد رفع Frontend>` |
| `PORT` | `3000` (Railway يحدده تلقائياً، لكن يمكن تعيينه) |

**لإنشاء JWT_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🎨 الخطوة 3: إنشاء Frontend Service

### الطريقة الموصى بها: Vercel (مجاني دائماً)

1. اذهب إلى [vercel.com](https://vercel.com)
2. اضغط **Add New** → **Project**
3. اختر Repository: `crm-system`
4. إعدادات:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL` = `<رابط Backend من Railway>`
   
   مثال: `https://crm-backend-production.up.railway.app/api`

### أو استخدام Railway Static Site:

1. في Railway، اضغط **+ New** → **Static Site**
2. اختر Repository: `crm-system`
3. إعدادات:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist`

---

## ⚙️ تحديث Backend CORS

بعد رفع Frontend، حدّث `CORS_ORIGIN` في Railway:

1. اذهب إلى Backend Service → **Variables**
2. حدّث `CORS_ORIGIN`:
   - إذا Frontend على Vercel: `https://crm-frontend.vercel.app`
   - إذا Frontend على Railway: `<رابط Static Site من Railway>`

---

## 🔧 إصلاح مشاكل Railway

### مشكلة: "Script start.sh not found"

✅ **الحل**: استخدم `Procfile` أو `railway.json` (تم إنشاؤهما ✅)

### مشكلة: "Could not determine how to build"

**الحل 1**: حدد Root Directory في Railway Settings:
- اذهب إلى Service → **Settings** → **Source**
- **Root Directory**: `backend`

**الحل 2**: استخدم ملفات التكوين (موجودة الآن ✅):
- `railway.json` - للتكوين الشامل
- `Procfile` - لـ start command
- `nixpacks.toml` - لـ build process

### مشكلة: "Prisma Client not generated"

**الحل**: تأكد من أن Build Command يحتوي:
```bash
npm install && npx prisma generate && npm run build
```

### مشكلة: "Port not found"

**الحل**: Railway يحدد PORT تلقائياً في `process.env.PORT`. 
تحقق من أن `backend/src/main.ts` يستخدم:
```typescript
const port = process.env.PORT || 3000;
```

---

## 📝 ملفات التكوين المطلوبة

### ✅ تم إنشاءها:

1. **railway.json** - تكوين Railway الرئيسي
2. **Procfile** - start command
3. **nixpacks.toml** - build configuration

### ملفات أخرى موجودة:

- `backend/package.json` - يحتوي على scripts
- `backend/src/main.ts` - يستخدم `process.env.PORT`

---

## 🎯 خطوات سريعة للرفع:

### 1. في Railway:
1. ✅ أنشئ PostgreSQL Database (أو استخدم Supabase)
2. ✅ أنشئ Service من GitHub Repo
3. ✅ حدد Root Directory: `backend`
4. ✅ أضف Environment Variables
5. ✅ Deploy!

### 2. Frontend على Vercel:
1. ✅ اربط GitHub Repo
2. ✅ Root Directory: `frontend`
3. ✅ Build Command: `npm run build`
4. ✅ Environment Variable: `VITE_API_URL`
5. ✅ Deploy!

---

## ✅ التحقق من النجاح

### Backend:
- ✅ يفتح على: `https://crm-backend-production.up.railway.app`
- ✅ API Docs: `https://crm-backend-production.up.railway.app/api/docs`

### Frontend:
- ✅ يفتح على: `https://crm-frontend.vercel.app` (أو Railway URL)
- ✅ يمكن تسجيل الدخول بنجاح

---

## 💰 التكلفة

**Railway Free Tier:**
- ✅ $5 رصيد مجاني شهرياً
- ✅ 500 ساعة تشغيل مجانية
- ⚠️ يكفي للمشاريع الصغيرة إلى المتوسطة

**Supabase Free Tier:**
- ✅ Database مجاني دائماً (500MB)
- ✅ 2M API requests/شهر

**Vercel Free Tier:**
- ✅ Frontend مجاني دائماً
- ✅ 100GB bandwidth/شهر

---

## 🆘 إذا استمرت المشاكل:

1. ✅ تحقق من Logs في Railway Dashboard
2. ✅ تأكد من Root Directory: `backend`
3. ✅ تأكد من Environment Variables
4. ✅ تأكد من Build Command صحيح

أخبرني إذا واجهت أي مشكلة!

