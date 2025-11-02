# 🔧 حل خطأ Nixpacks: "undefined variable 'npm'"

## 🔴 المشكلة:
```
error: undefined variable 'npm'
at /app/.nixpacks/nixpkgs-...nix:19:21:
   18|         '')
   19|         nodejs-18_x npm
   20|                     ^
```

## ✅ الحل:
تم إصلاح `nixpacks.toml` - إزالة `npm` من `nixPkgs` لأن:
- ✅ `nodejs` يأتي مع `npm` تلقائياً
- ✅ `npm` ليس اسم package صحيح في Nix

## 📝 الملف المصحح:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]  # ✅ بدون npm

[phases.install]
cmds = [
  "cd backend && npm ci --production=false",
  "cd backend && npx prisma generate"
]

[phases.build]
cmds = [
  "cd backend && npm run build"
]

[start]
cmd = "cd backend && npx prisma migrate deploy && npm run start:prod"
```

## 🚀 الخطوات:

1. ✅ تم إصلاح `nixpacks.toml`
2. 📤 ارفع الملف الجديد على GitHub:
   ```powershell
   git add nixpacks.toml
   git commit -m "Fix nixpacks.toml - remove npm from nixPkgs"
   git push
   ```
3. 🔄 في Railway: اضغط **Redeploy**

## ✅ بعد الإصلاح:

Railway سيستخدم الآن:
- ✅ `nodejs-18_x` فقط (يأتي مع npm تلقائياً)
- ✅ Commands صحيحة للبناء والتشغيل

---

## 📝 ملاحظة:

إذا استمرت المشكلة، يمكنك:
1. ✅ حذف `nixpacks.toml` واستخدام إعدادات Railway الافتراضية
2. ✅ أو استخدام Dockerfile بدلاً من Nixpacks

لكن الحل الحالي يجب أن يعمل! ✅

