@echo off
chcp 65001 >nul
echo 📤 رفع المشروع على GitHub (مع حل مشاكل الرفع)
echo.

echo 🔍 التحقق من تثبيت Git...
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git غير مثبت!
    echo.
    pause
    exit /b 1
)

echo ✅ Git مثبت
echo.

echo ⚙️  تحسين إعدادات Git للرفع...
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
git config --global http.version HTTP/1.1
git config --global http.timeout 600

echo ✅ تم تحسين الإعدادات
echo.

echo 📋 الحالة الحالية...
git status

echo.
echo 🔄 إضافة جميع الملفات...
git add .

echo.
echo 💾 حفظ التغييرات...
git commit -m "Fix merge conflicts and prepare for deployment" 2>&1

echo.
echo 📤 محاولة الرفع...
echo ⏳ قد يستغرق هذا بعض الوقت (حسب حجم الملفات وسرعة الإنترنت)...
echo.
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ تم الرفع بنجاح!
    echo.
    echo 🎉 المشروع الآن على GitHub!
) else (
    echo.
    echo ❌ فشل الرفع
    echo.
    echo 💡 الحلول البديلة:
    echo    1. جرب استخدام GitHub Desktop
    echo    2. استخدم SSH بدلاً من HTTPS
    echo    3. ارفع الملفات على دفعات
    echo.
    echo 📖 انظر: حل_مشكلة_رفع_GitHub.md للتفاصيل
)

echo.
pause

