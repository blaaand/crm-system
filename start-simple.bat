@echo off
chcp 65001 >nul
echo 🚀 تشغيل المشروع - الطريقة البسيطة
echo.

echo 🔄 إيقاف العمليات السابقة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo 📡 بدء تشغيل Backend...
cd backend
start "CRM-Backend" cmd /k "npm run start:dev"

echo.
echo ⏳ انتظار بدء Backend... (قد يستغرق 15-20 ثانية)
echo    يرجى الانتظار حتى ترى رسالة "Application is running" في نافذة Backend
echo.

REM انتظار أطول للـ Backend ليبدأ (15 ثانية)
timeout /t 15 /nobreak >nul

REM محاولة فحص أن Backend يعمل
echo 🔍 التحقق من أن Backend يعمل...
powershell -Command "$response = try { Invoke-WebRequest -Uri 'http://localhost:3000/api' -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; $true } catch { $false }; if ($response) { Write-Host '✅ Backend يعمل بنجاح!' } else { Write-Host '⚠️  Backend لم يبدأ بعد. يرجى التحقق من نافذة Backend' }"

echo.
echo 🎨 بدء تشغيل Frontend...
cd ..\frontend
start "CRM-Frontend" cmd /k "npm run dev"

echo.
echo ✅ تم بدء تشغيل المشروع!
echo.
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:3000
echo 📚 API Docs: http://localhost:3000/api/docs
echo.
echo ⚠️  مهم جداً:
echo    1. تحقق من نافذة Backend - يجب أن ترى "Application is running on: http://localhost:3000"
echo    2. إذا كان هناك خطأ في Backend، سيظهر في النافذة
echo    3. انتظر 10-15 ثانية أخرى بعد بدء Frontend قبل محاولة تسجيل الدخول
echo.
echo 👤 بيانات الدخول:
echo    البريد: admin@crm.com
echo    كلمة المرور: admin123
echo.
echo ❌ لإيقاف المشروع: اغلق النوافذ الطرفية
echo.
pause
