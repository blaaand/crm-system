@echo off
chcp 65001 >nul
echo 🔧 إصلاح مشكلة الاتصال بالـ Backend
echo.

echo 🔄 إيقاف جميع عمليات Node.js...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo 📡 إعادة تشغيل Backend...
cd backend

echo.
echo ⏳ انتظار بدء Backend (20 ثانية)...
start "CRM-Backend-Fixed" cmd /k "npm run start:dev"
timeout /t 20 /nobreak >nul

echo.
echo 🔍 التحقق من أن Backend يعمل...
powershell -Command "$response = try { Invoke-WebRequest -Uri 'http://localhost:3000/api/docs' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; Write-Host '✅ Backend يعمل بنجاح!'; $true } catch { Write-Host '❌ Backend لم يبدأ بعد'; $false }; if (-not $response) { Write-Host ''; Write-Host '⚠️  يرجى التحقق من نافذة Backend للأخطاء'; Write-Host '⚠️  قد تحتاج إلى:'; Write-Host '   1. التحقق من أن Port 3000 غير مستخدم'; Write-Host '   2. التحقق من قاعدة البيانات (dev.db موجود)'; Write-Host '   3. إعادة تثبيت التبعيات: npm install' }"

echo.
echo 🎨 إعادة تشغيل Frontend...
cd ..\frontend
start "CRM-Frontend-Fixed" cmd /k "npm run dev"

echo.
echo ✅ تم إعادة التشغيل!
echo.
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:3000
echo 📚 API Docs: http://localhost:3000/api/docs
echo.
echo ⚠️  إذا استمرت المشكلة:
echo    1. افتح نافذة Backend وتحقق من الأخطاء
echo    2. تأكد من أن قاعدة البيانات موجودة: backend\prisma\dev.db
echo    3. تأكد من أن Port 3000 غير مستخدم: netstat -ano | findstr :3000
echo.
pause

