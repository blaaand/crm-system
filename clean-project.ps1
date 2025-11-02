# 🧹 سكربت تنظيف المشروع تلقائياً
# يوفر الوقت ويضمن تنظيف شامل للمشروع

Write-Host "🧹 بدء تنظيف المشروع..." -ForegroundColor Cyan

# 🗑️ حذف المجلدات المؤقتة
Write-Host "`n📁 حذف المجلدات المؤقتة..." -ForegroundColor Yellow

$folders = @(
    "backend\node_modules",
    "backend\dist",
    "frontend\node_modules",
    "frontend\dist",
    "frontend\build",
    "node_modules"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "  ✓ حذف: $folder" -ForegroundColor Green
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 🗑️ حذف ملفات النظام والمؤقتة
Write-Host "`n🗑️ حذف الملفات المؤقتة..." -ForegroundColor Yellow

$files = @(
    ".vercel",
    ".railway",
    ".render",
    ".firebase"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ حذف: $file" -ForegroundColor Green
        Remove-Item -Path $file -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# حذف الملفات المؤقتة (log, DS_Store, etc.)
Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -in @(".DS_Store", ".env.old", ".env.backup") -or 
                   $_.Extension -eq ".log" -or
                   $_.Name -like "*.bak" } | 
    ForEach-Object {
        Write-Host "  ✓ حذف: $($_.FullName)" -ForegroundColor Green
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }

# 🧹 تنظيف npm cache
Write-Host "`n🧹 تنظيف npm cache..." -ForegroundColor Yellow

if (Test-Path "backend") {
    Write-Host "  📦 تنظيف backend..." -ForegroundColor Cyan
    Set-Location backend
    npm cache clean --force 2>&1 | Out-Null
    Set-Location ..
}

if (Test-Path "frontend") {
    Write-Host "  📦 تنظيف frontend..." -ForegroundColor Cyan
    Set-Location frontend
    npm cache clean --force 2>&1 | Out-Null
    Set-Location ..
}

# 📊 ملخص
Write-Host "`n✅ اكتمل التنظيف بنجاح!" -ForegroundColor Green
Write-Host "`n📝 ملاحظات:" -ForegroundColor Cyan
Write-Host "  • تم حذف جميع المجلدات المؤقتة" -ForegroundColor White
Write-Host "  • تم حذف الملفات المؤقتة" -ForegroundColor White
Write-Host "  • تم تنظيف npm cache" -ForegroundColor White
Write-Host "`n💡 للحصول على التبعيات مجدداً:" -ForegroundColor Yellow
Write-Host "   cd backend  && npm install" -ForegroundColor White
Write-Host "   cd frontend && npm install" -ForegroundColor White

