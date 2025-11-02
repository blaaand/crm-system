# ✅ حل مشكلة Start Command

## ⚠️ **المشكلة:**

Railway يستخدم `npm run start:prod` كـ Start Command مباشرة بدون Build

---

## ✅ **الحل:**

### **في Railway:**

1. اذهب إلى **Settings** → **Deploy**
2. ابحث عن **Start Command**
3. **احذف `npm run start:prod`**
4. اتركه **فارغ**
5. **احفظ**

---

## 🔧 **السبب:**

**إذا Start Command محدد في Railway:**
- Railway يتجاهل `Procfile`
- يبدأ مباشرة بدون Build phase

**إذا Start Command فارغ:**
- Railway يستخدم `Procfile`
- `Procfile` يتحقق من `dist` ويبني إذا لزم

---

## ✅ **بعد حذف Start Command:**

**Railway سيستخدم `Procfile`:**
```bash
web: sh -c "if [ ! -d dist ]; then npm run build; fi && npx prisma migrate deploy && npm run start:prod"
```

**هذا سيقوم بـ:**
1. التحقق من وجود `dist`
2. إذا لم يكن موجود: `npm run build`
3. ثم: `npx prisma migrate deploy`
4. ثم: `npm run start:prod`

---

## 🚀 **الخطوة التالية:**

1. **احذف Start Command في Railway**
2. **احفظ**
3. **أعد Deploy**

---

**✅ الآن جرّب وشوف النتيجة!**

