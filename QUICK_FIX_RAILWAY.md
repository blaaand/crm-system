# ⚡ حل سريع لمشكلة Railway

## 🔴 المشكلة:
- ❌ "Script start.sh not found"
- ❌ "Railpack could not determine how to build the app"

## ✅ الحل السريع:

### 1. في Railway Dashboard:

**اذهب إلى Service → Settings → Source:**

✅ **Root Directory**: `backend`

هذا أهم شيء! بدون هذا، Railway لن يجد `package.json` الخاص بالـ Backend.

---

### 2. Environment Variables:

في **Variables** tab، أضف:

```
NODE_ENV=production
DATABASE_URL=postgresql://... (من Supabase أو Railway DB)
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://your-frontend-url.vercel.app (أو Railway URL)
PORT=3000
```

---

### 3. إعادة Deploy:

#### الطريقة A: Redeploy
- اذهب إلى **Deployments**
- اضغط **Redeploy**

#### الطريقة B: إنشاء من جديد (إذا فشل Redeploy)
1. احذف Service الحالي
2. اضغط **+ New** → **GitHub Repo**
3. اختر `crm-system`
4. عند الإنشاء، في **Settings** → **Source**:
   - ✅ **Root Directory**: `backend`
5. أضف Environment Variables
6. Deploy!

---

## 📝 ملاحظات مهمة:

### ✅ الملفات المطلوبة (تم إنشاؤها):
- ✅ `railway.json`
- ✅ `Procfile`
- ✅ `nixpacks.toml`
- ✅ `package.json` (في الجذر)

### ⚠️ تأكد من:
- ✅ **Root Directory = `backend`** (أهم شيء!)
- ✅ `DATABASE_URL` موجود وصحيح
- ✅ `JWT_SECRET` موجود

---

## 🎯 بعد الإصلاح:

في Logs يجب أن ترى:
```
✅ Installing dependencies...
✅ Generating Prisma Client...
✅ Building application...
✅ Starting application...
🚀 Application is running...
```

---

## 🔗 الخطوة التالية:

بعد نجاح Backend:
1. ارفع Frontend على Vercel (أو Railway Static Site)
2. حدّث `CORS_ORIGIN` في Railway برابط Frontend

---

## 🆘 إذا استمرت المشكلة:

أخبرني:
1. ماذا يظهر في Logs؟
2. هل قمت بتعيين Root Directory = `backend`؟
3. ما هي Environment Variables المضافة؟

