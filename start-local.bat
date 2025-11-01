@echo off
chcp 65001 >nul
echo 🚀 تشغيل المشروع للتطوير المحلي
echo.

echo 🔄 إيقاف العمليات السابقة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo 📦 التحقق من التبعيات...
cd backend
if not exist "node_modules" (
    echo ⏳ تثبيت تبعيات Backend...
    call npm install
)
cd ..

cd frontend
if not exist "node_modules" (
    echo ⏳ تثبيت تبعيات Frontend...
    call npm install
)
cd ..

echo.
echo 🗄️ إعداد قاعدة البيانات المحلية...
cd backend
if not exist "prisma\dev.db" (
    echo 📝 إنشاء قاعدة البيانات...
    call npx prisma migrate dev --name init
) else (
    echo ✅ قاعدة البيانات موجودة
    call npx prisma generate
)
cd ..

echo.
echo 📡 بدء تشغيل Backend...
cd backend
start "CRM-Backend" cmd /k "npm run start:dev"

echo.
echo ⏳ انتظار بدء Backend... (15 ثانية)
timeout /t 15 /nobreak >nul

echo.
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
echo 👤 بيانات الدخول الافتراضية:
echo    البريد: admin@crm.com
echo    كلمة المرور: admin123
echo.
echo ⚠️  إذا كانت هذه أول مرة:
echo    1. تحقق من نافذة Backend - يجب أن ترى "Application is running"
echo    2. إذا ظهرت أخطاء قاعدة البيانات، قم بتشغيل: cd backend && npx prisma migrate dev
echo.
echo ❌ لإيقاف المشروع: اغلق النوافذ الطرفية
echo.
pause

