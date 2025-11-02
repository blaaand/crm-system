# 🔧 حل مشكلة "can't cd to backend"

## ⚠️ **المشكلة:**

```
sh: 1: cd: can't cd to backend
```

---

## 🔍 **السبب:**

Railway يحاول الانتقال إلى مجلد `backend`، لكن:
- إما Railway Service Root Directory خاطئ
- أو الملفات `Procfile` و `nixpacks.toml` تحاول الانتقال إلى `backend` بينما هي بالفعل داخل `backend`

---

## ✅ **الحل:**

### **الخيار 1: ضبط Root Directory في Railway**

**إذا Service في Railway Root Directory = `/` (المشروع كامل):**

1. اذهب إلى Railway Backend Service
2. Settings → **Source**
3. **Root Directory:** غيرّه إلى `backend`
4. احفظ
5. أعد Deploy

---

### **الخيار 2: إنشاء Service جديد من المجلد `backend`**

**إذا لا تستطيع تغيير Root Directory:**

1. احذف Backend Service الحالي
2. أنشئ Service جديد:
   - + New → **GitHub Repo**
   - اختر `crm-system`
   - **Root Directory:** `backend`
3. أضف Environment Variables
4. Deploy

---

### **الخيار 3: تعديل الملفات**

**إذا Root Directory = `backend` في Railway:**

يجب تعديل `Procfile` و `nixpacks.toml` لتعمل بدون `cd backend`

---

## 🎯 **الخيار الموصى به:**

### **استخدام Root Directory = `backend` في Railway**

---

## 🔧 **الخطوات:**

### **1️⃣ حذف الملفات القديمة**

احذف هذه الملفات من المشروع (لأنها تجعل Railway يحاول `cd backend`):

```bash
# احذف إذا Root Directory = backend
rm Procfile
rm nixpacks.toml
```

---

### **2️⃣ تعديل `package.json`**

أضف scripts للـ build و deploy في `backend/package.json`:

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main",
    "postinstall": "prisma generate",
    "deploy": "prisma migrate deploy && npm run start:prod"
  }
}
```

---

### **3️⃣ إعداد Railway Service**

في Railway:

1. Settings → **Source**
2. **Root Directory:** `backend` ✅
3. احفظ

---

### **4️⃣ إعداد Build Command**

1. Settings → **Build**
2. **Build Command:** اتركه فارغ (أو `npm run build`)
3. Railway سيكتشف تلقائياً

---

### **5️⃣ إعداد Start Command**

1. Settings → **Start**
2. **Start Command:** `npm run deploy`

أو بدون migration:
```bash
npm run start:prod
```

---

## ✅ **الخيار الأسهل والأسرع:**

### **إعادة إنشاء Backend Service**

1. **في Railway:**
   - احذف Backend Service الحالي
   
2. **أنشئ Service جديد:**
   - + New → **GitHub Repo**
   - اختر `crm-system`
   
3. **في Prompt:**
   - **Root Directory:** `backend`
   
4. **أضف Environment Variables:**
   ```
   DATABASE_URL=...
   JWT_SECRET=...
   CORS_ORIGIN=...
   ```
   
5. **Railway سيكتشف تلقائياً:**
   - `package.json` في `backend`
   - `nest build` كـ build command
   - `node dist/main` كـ start command
   
6. **Deploy**

---

## 📝 **ملاحظات:**

### **Build Command:**

Railway يكتشف تلقائياً من `package.json`:
- `npm run build` → `nest build`
- `npm run start` → `node dist/main`

---

### **Start Command:**

إذا أردت migration قبل start:
```bash
npx prisma migrate deploy && npm run start:prod
```

---

### **Environment Variables:**

تأكد من إضافة:
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `NODE_ENV=production`

---

## 🆘 **إذا استمرت المشكلة:**

### **افحص:**

1. **Root Directory في Railway:**
   - Settings → Source → Root Directory
   - يجب أن يكون: `backend`

2. **الملفات في Root:**
   - هل يوجد `package.json`؟
   - هل يوجد `src/`؟
   - هل يوجد `prisma/`؟

3. **Logs:**
   - هل تظهر أخطاء في build أو install؟

---

## ✅ **قائمة التحقق:**

- [ ] تم ضبط Root Directory = `backend` في Railway
- [ ] تم إضافة Environment Variables
- [ ] تم Deploy
- [ ] Status = Ready
- [ ] `/api/health` يعمل

---

**🎯 جرّب الخيار الأسهل: إعادة إنشاء Backend Service مع Root Directory = backend**

