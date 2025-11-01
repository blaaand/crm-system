@echo off
chcp 65001 >nul
echo 📤 رفع المشروع على GitHub
echo.

echo 🔍 التحقق من تثبيت Git...
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git غير مثبت!
    echo.
    echo ⚠️  يجب تثبيت Git أولاً:
    echo    1. اذهب إلى: https://git-scm.com/download/win
    echo    2. حمّل وثبت Git for Windows
    echo    3. أعد تشغيل هذا الملف بعد التثبيت
    echo.
    echo 💡 أو استخدم GitHub Desktop (أسهل):
    echo    https://desktop.github.com
    echo.
    pause
    exit /b 1
)

echo ✅ Git مثبت
echo.

echo 📋 الحالة الحالية...
git status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚙️  تهيئة Git Repository...
    git init
)

echo.
echo 📝 إضافة الملفات...
git add .

echo.
echo 💾 حفظ التغييرات...
git commit -m "Initial commit: CRM System ready for deployment" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  لا توجد تغييرات جديدة للرفع
)

echo.
echo ✅ تم تحضير المشروع للرفع!
echo.
echo 📤 الخطوات التالية:
echo.
echo 1️⃣  إذا لم يكن لديك Repository على GitHub:
echo    - اذهب إلى: https://github.com/new
echo    - أنشئ Repository جديد (اسمه: crm-system)
echo    - ❌ لا تضع علامة على "Initialize with README"
echo.
echo 2️⃣  بعد إنشاء Repository، اربطه بالمشروع:
echo    git remote add origin https://github.com/YOUR_USERNAME/crm-system.git
echo.
echo 3️⃣  ارفع الملفات:
echo    git push -u origin main
echo.
echo 💡 إذا طُلب اسم مستخدم وكلمة مرور:
echo    - Username: اسم مستخدم GitHub
echo    - Password: Personal Access Token (ليس كلمة المرور!)
echo    - كيفية إنشاء Token: انظر GITHUB_SETUP.md
echo.
echo 🎯 أو استخدم GitHub Desktop (أسهل):
echo    https://desktop.github.com
echo.
pause

