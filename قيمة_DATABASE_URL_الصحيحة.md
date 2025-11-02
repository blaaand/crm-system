# ✅ قيمة DATABASE_URL الصحيحة

## 📋 **المعلومات:**

```
URL: postgresql://postgres:[YOUR_PASSWORD]@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres
Password: A01156573876
```

---

## ✅ **DATABASE_URL الصحيح:**

### **مع SSL (موصى به):**

```
postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres?sslmode=require
```

---

### **بدون SSL:**

```
postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres
```

---

## 🔧 **في Railway:**

### **Backend Service → Variables:**

1. ابحث عن `DATABASE_URL`
2. استبدل بقيمة:
   ```
   postgresql://postgres:A01156573876@db.onyxkfdzbkbuxzwjcnho.supabase.co:5432/postgres?sslmode=require
   ```
3. احفظ
4. أعد Deploy

---

## ✅ **بعد Deploy:**

**يجب أن ترى:**
```
🚀 Application is running on: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
```

---

**🎯 استبدل DATABASE_URL في Railway وأعد Deploy!**

