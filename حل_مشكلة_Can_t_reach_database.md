# ⚠️ حل مشكلة Can't reach database

## ❌ **المشكلة:**
```
Error: P1001: Can't reach database server at `db.onyxkfdzbkbuxzwjcnho.supabase.co:5432`
```

---

## 🔍 **الحلول المحتملة:**

### **1️⃣ التحقق من Supabase Project Status**

في Supabase Dashboard:
1. https://supabase.com/dashboard
2. اختر project `crm-db`
3. تحقق من الحالة

**إذا Project Paused:**
- اضغط Resume / Activate

---

### **2️⃣ IP Whitelisting**

Railway IP addresses قد تكون محجوبة

#### **في Supabase:**
1. Project Settings → **Network**
2. **Allowed IPs** / **Trusted IPs**
3. إضافة:
   ```
   0.0.0.0/0
   ```
   أو
   ```
   Allow all IPs (للاختبار)
   ```

---

### **3️⃣ استخدام Connection Pooler**

#### **في Supabase:**
1. Project Settings → **Database**
2. Connection Pooling → **Connection string**
3. اختر **Session mode**:
   ```
   postgresql://postgres.onyxkfdzbkbuxzwjcnho:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

---

### **4️⃣ استخدام Port 6500**

جرب Port 6500 بدلاً من 5432:

```
postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:6500/postgres?sslmode=require
```

---

### **5️⃣ التحقق من DATABASE_URL**

في Railway Variables، تأكد أن `DATABASE_URL` بالشكل:

```
postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres?sslmode=require
```

**بدون علامات اقتباس إضافية**

---

## 🆘 **الحل الأكثر احتمالاً:**

### **إضافة Railway IPs إلى Supabase:**

1. في Supabase:
   - Settings → Network
   - Add: `0.0.0.0/0`
   - أو Enable "Trust all IPs"

2. في Railway:
   - Backend Variables
   - تأكد `DATABASE_URL` صحيح

3. أعد Deploy

---

## ✅ **بعد الحل:**

يجب أن ترى في Logs:
```
Migration completed successfully
🚀 Application is running on: http://localhost:3000
```

---

**🎯 جرّب إضافة `0.0.0.0/0` في Supabase Network أولاً!**

