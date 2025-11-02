# 🔍 كيف تجد Connection Pooler في Supabase

## 📍 **الخطوات:**

### **1️⃣ اذهب إلى Database**

من Project Settings، اضغط على **Database** في القائمة الجانبية

---

### **2️⃣ ابحث عن Connection Pooling**

في صفحة Database، ابحث عن:

- **Connection pooling**
- **Connection string**
- **Pooler**

---

### **3️⃣ انسخ Connection String**

إذا وجدت **Connection Pooling**:

1. اضغط عليه
2. اختر **Session mode**
3. انسخ **Connection string**

**سيظهر مثل:**
```
postgresql://postgres.onyxkfdzbkbuxzwjcnho:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

### **4️⃣ في Railway**

Backend Variables → `DATABASE_URL` → استبدل بقيمة Pooler

---

## 🆘 **إذا لم تجد Connection Pooling:**

### **استخدم Direct Connection مع Port 6500:**

في Railway Backend Variables:

```
DATABASE_URL=postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:6500/postgres?sslmode=require
```

**ملاحظة:** تم تغيير Port من `5432` إلى `6500`

---

## ✅ **بعد تحديث DATABASE_URL:**

1. احفظ في Railway
2. أعد Deploy

---

**🎯 اذهب إلى Database أولاً!**

