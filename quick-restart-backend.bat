@echo off
chcp 65001 >nul
echo 🔄 إعادة تشغيل Backend فقط
echo.

echo ⏹️  إيقاف Backend...
taskkill /F /FI "WINDOWTITLE eq CRM-Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq CRM-Backend-Fixed*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo 📡 بدء تشغيل Backend...
cd backend
start "CRM-Backend" cmd /k "npm run start:dev"

echo.
echo ✅ تم إعادة تشغيل Backend!
echo.
echo ⏳ انتظار 10 ثواني للبدء...
timeout /t 10 /nobreak >nul

echo.
echo 🔍 التحقق من أن Backend يعمل...
powershell -Command "$response = try { Invoke-WebRequest -Uri 'http://localhost:3000/api/docs' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; Write-Host '✅ Backend يعمل بنجاح!' -ForegroundColor Green; $true } catch { Write-Host '⚠️  Backend لا يزال يبدأ... يرجى التحقق من نافذة Backend' -ForegroundColor Yellow; $false }"

echo.
echo 🔧 Backend: http://localhost:3000
echo 📚 API Docs: http://localhost:3000/api/docs
echo.
pause

