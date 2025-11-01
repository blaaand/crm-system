# 🔧 حل مشكلة Railway: "Script start.sh not found"

## ✅ تم إنشاء الملفات المطلوبة:

1. ✅ `railway.json` - تكوين Railway
2. ✅ `Procfile` - start command
3. ✅ `nixpacks.toml` - build configuration
4. ✅ `package.json` - في الجذر (لـ Railway)

---

## 🚀 خطوات إصلاح المشكلة في Railway:

### الخطوة 1: إعدادات Service في Railway

1. اذهب إلى Railway Dashboard → Service
2. اضغط **Settings**
3. في قسم **Source**:
   - ✅ **Root Directory**: `backend`
   
4. في قسم **Deploy**:
   - **Build Command**: (اتركه فارغاً - سيستخدم nixpacks.toml)
   - **Start Command**: (اتركه فارغاً - سيستخدم Procfile)

### الخطوة 2: إعادة Deploy

1. اذهب إلى **Deployments**
2. اضغط **Redeploy** أو احذف Service وأنشئه من جديد

---

## 📋 Environment Variables المطلوبة:

في Railway → Service → **Variables**، أضف:

| Key | Value | ملاحظات |
|-----|-------|---------|
| `NODE_ENV` | `production` | ⚠️ مطلوب |
| `DATABASE_URL` | `postgresql://...` | من Supabase أو Railway DB |
| `JWT_SECRET` | `<أنشئ مفتاح>` | ⚠️ مطلوب |
| `CORS_ORIGIN` | `<رابط Frontend>` | سيتم إضافته لاحقاً |
| `PORT` | `3000` | Railway يحدده تلقائياً |

---

## 🔍 طريقة التحقق من المشكلة:

### 1. تحقق من Logs:
- اذهب إلى **Deployments** → **View Logs**
- ابحث عن أخطاء في:
  - Build phase
  - Start phase

### 2. تحقق من Root Directory:
- تأكد من أن **Root Directory** = `backend`
- بدون هذا، Railway لن يجد `package.json` الخاص بـ Backend

---

## 🎯 إذا استمرت المشكلة:

### الحل البديل: إنشاء Service من جديد

1. احذف Service الحالي
2. اضغط **+ New** → **GitHub Repo**
3. اختر `crm-system`
4. عند الإنشاء، في **Settings**:
   - ✅ **Root Directory**: `backend`
5. أضف Environment Variables
6. Deploy!

---

## ✅ بعد الإصلاح:

بعد النجاح، يجب أن ترى في Logs:
```
✅ Build completed successfully
✅ Starting application...
🚀 Application is running on: http://localhost:PORT
```

---

## 📞 إذا لم تحل المشكلة:

1. ✅ أرسل لي Logs من Railway
2. ✅ تأكد من Root Directory: `backend`
3. ✅ تأكد من Environment Variables

سأساعدك في حل المشكلة!

