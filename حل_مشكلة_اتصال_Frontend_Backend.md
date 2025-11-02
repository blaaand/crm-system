# 🔧 حل مشكلة الاتصال بين Frontend و Backend

## ⚠️ **المشكلة:**

عند محاولة تسجيل الدخول، يظهر الخطأ:

```
لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم الخلفي على المنفذ 3000
```

## 🔍 **السبب:**

الـ Frontend لا يعرف عنوان Backend للإنتاج لأن متغير `VITE_API_URL` غير معرف.

---

## ✅ **الحل:**

### **إذا موقعك على Render:**

1. **احصل على رابط Backend من Render:**
   - اذهب إلى [dashboard.render.com](https://dashboard.render.com)
   - افتح Backend Service الخاص بك
   - اذهب إلى **Settings** → **Domains**
   - انسخ الرابط (مثل: `https://crm-backend.onrender.com`)

2. **أضف `/api` في النهاية:**
   ```
   https://crm-backend.onrender.com/api
   ```

3. **في Render Dashboard → Frontend Service:**
   - اذهب إلى **Environment** tab
   - أضف Environment Variable:
     - **Key**: `VITE_API_URL`
     - **Value**: `https://crm-backend.onrender.com/api`
   - احفظ

4. **أعد Deploy للـ Frontend:**
   - اذهب إلى **Deployments**
   - اضغط **Manual Deploy** → **Deploy latest commit**

---

### **إذا موقعك على Vercel:**

1. **احصل على رابط Backend** (من Render أو Railway)

2. **في Vercel Dashboard:**
   - افتح Project الخاص بك
   - اذهب إلى **Settings** → **Environment Variables**
   - أضف:
     - **Key**: `VITE_API_URL`
     - **Value**: `https://your-backend-url.railway.app/api` (أو `.onrender.com/api`)
     - **Environment**: Production, Preview, Development
   - احفظ

3. **أعد Deploy:**
   - اذهب إلى **Deployments**
   - اضغط **Redeploy** للـ deployment الأخير

---

### **إذا موقعك على Railway (Static Site):**

1. **احصل على رابط Backend** (Railway Service URL)

2. **في Railway:**
   - افتح Frontend Service
   - اذهب إلى **Variables** tab
   - أضف:
     - **Key**: `VITE_API_URL`
     - **Value**: `https://crm-backend-production.up.railway.app/api`
   - احفظ

3. **Railway سيقوم بإعادة Deploy تلقائياً**

---

## 🔍 **التحقق من الحل:**

بعد إضافة `VITE_API_URL` وإعادة Deploy، افتح المتصفح Console (F12) وتحقق:

1. **افتح موقعك**
2. **اضغط F12** لفتح Developer Tools
3. **انتقل إلى Console**
4. **جرّب تسجيل الدخول**
5. **إذا نجح**: سترى طلبات API في Network tab
6. **إذا فشل**: افحص Console للأخطاء

---

## 📝 **ملاحظات مهمة:**

### **CORS:**
تأكد من أن `CORS_ORIGIN` في Backend يحتوي على Frontend URL الصحيح:

**في Backend Environment Variables:**
```
CORS_ORIGIN=https://your-frontend-url.vercel.app
أو
CORS_ORIGIN=https://your-frontend-url.onrender.com
```

### **Format الـ URL:**
- ✅ **صحيح**: `https://backend.onrender.com/api`
- ❌ **خطأ**: `https://backend.onrender.com` (بدون `/api`)

---

## 🆘 **إذا استمرت المشكلة:**

### **التحقق من Logs:**

1. **Backend Logs** (Render/Railway):
   - افحص Logs للتأكد من أن Backend يعمل
   - تأكد من عدم وجود أخطاء في الاتصال بقاعدة البيانات

2. **Frontend Console**:
   - افتح Browser Console (F12)
   - افحص رسائل الخطأ
   - تحقق من `baseURL` في Network tab

### **اختبار Backend مباشرة:**

افتح في المتصفح:
```
https://your-backend-url.railway.app/api/health
أو
https://your-backend-url.onrender.com/api/health
```

إذا رجع `OK`، يعني Backend يعمل ✅

---

## 📋 **خطوات سريعة:**

### **Render:**

```bash
1. dashboard.render.com
2. Frontend Service → Environment
3. Add: VITE_API_URL = https://crm-backend.onrender.com/api
4. Save & Redeploy
```

### **Vercel:**

```bash
1. vercel.com/dashboard
2. Project → Settings → Environment Variables
3. Add: VITE_API_URL = https://your-backend.railway.app/api
4. Save & Redeploy
```

### **Railway:**

```bash
1. railway.app
2. Frontend Service → Variables
3. Add: VITE_API_URL = https://backend.railway.app/api
4. Save (auto-redeploy)
```

---

**📅 تاريخ:** 2025-02-11  
**✅ الحالة:** جاهز للتطبيق

