# ⚡ حل سريع لمشكلة Backend Directory

## 🔍 **المشكلة:**

```
sh: 1: cd: can't cd to backend
```

---

## ✅ **الحل:**

### **في Railway Backend Service:**

1. اذهب إلى **Settings** → **Source**
2. ابحث عن **Root Directory**
3. غيرّه إلى: `backend`
4. **احفظ**
5. أعد **Deploy**

---

## 📝 **تفاصيل:**

**إذا Root Directory = `/`:**
- Railway سيحاول `cd backend` → فشل ❌

**إذا Root Directory = `backend`:**
- Railway يعمل مباشرة في `backend` → نجاح ✅

---

**🎯 هذا كل شيء! فقط غيّر Root Directory إلى `backend`!**

