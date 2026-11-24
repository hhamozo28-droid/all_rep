param(
  [switch]$Build
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Fail([string]$Message) {
  Write-Host $Message -ForegroundColor Red
  exit 1
}

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  Fail @"
Flutter غير مثبت على هذا الجهاز.
ثبّت Flutter ثم أعد تشغيل هذا السكربت:
  https://docs.flutter.dev/get-started/install/windows/mobile
"@
}

# --- Protect the hand-written files while adding the Android platform -------
$backups = @{}
foreach ($file in @("README.md", "pubspec.yaml", "analysis_options.yaml")) {
  if (Test-Path $file) {
    $backups[$file] = [System.IO.File]::ReadAllText((Resolve-Path $file))
  }
}

if (-not (Test-Path "android")) {
  Write-Host "==> إنشاء مجلد أندرويد (flutter create)" -ForegroundColor Cyan
  flutter create --platforms=android --project-name dordoc_mobile .
  if (Test-Path "test\widget_test.dart") {
    Remove-Item "test\widget_test.dart" -Force
  }
}

foreach ($entry in $backups.GetEnumerator()) {
  [System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) $entry.Key),
    $entry.Value,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

Write-Host "==> تنزيل الحزم (flutter pub get)" -ForegroundColor Cyan
flutter pub get

# --- Manifest: INTERNET permission + Arabic launcher label ------------------
$manifestPath = "android\app\src\main\AndroidManifest.xml"
if (-not (Test-Path $manifestPath)) {
  Fail "لم يتم العثور على android\app\src\main\AndroidManifest.xml"
}
$manifestFull = (Resolve-Path $manifestPath).Path
$xml = [System.IO.File]::ReadAllText($manifestFull)
if ($xml -notmatch 'android\.permission\.INTERNET') {
  $xml = $xml -replace '(?m)^(\s*)<application', "`$1<uses-permission android:name=`"android.permission.INTERNET`" />`r`n`$1<application"
}
$xml = $xml -replace 'android:label="[^"]*"', 'android:label="منصة دروسي"'
[System.IO.File]::WriteAllText(
  $manifestFull,
  $xml,
  (New-Object System.Text.UTF8Encoding($false))
)
Write-Host "==> تم ضبط اسم التطبيق وإذن الإنترنت" -ForegroundColor Green

# --- Application id (must not stay com.example.* for Google Play) -----------
$appId = "com.hamzachoaib.dordoc"
$idFiles = @("android\app\build.gradle.kts", "android\app\build.gradle")
foreach ($file in $idFiles) {
  if (-not (Test-Path $file)) { continue }
  $full = (Resolve-Path $file).Path
  $content = [System.IO.File]::ReadAllText($full)
  $updated = $content -replace 'applicationId\s*=?\s*"[^"]*"', "applicationId = `"$appId`""
  if ($updated -ne $content) {
    [System.IO.File]::WriteAllText(
      $full,
      $updated,
      (New-Object System.Text.UTF8Encoding($false))
    )
    Write-Host "==> applicationId = $appId ($file)" -ForegroundColor Green
  }
}

# --- Launcher icons from the same artwork as the PWA ------------------------
if (Test-Path "assets\icon.png") {
  Write-Host "==> توليد أيقونة التطبيق" -ForegroundColor Cyan
  dart run flutter_launcher_icons
}

Write-Host "==> فحص الكود (flutter analyze)" -ForegroundColor Cyan
flutter analyze

if ($Build) {
  Write-Host "==> بناء APK للإصدار" -ForegroundColor Cyan
  flutter build apk --release
  Write-Host "==> بناء حزمة Google Play (AAB)" -ForegroundColor Cyan
  flutter build appbundle --release
  Write-Host ""
  Write-Host "APK: build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor Green
  Write-Host "AAB: build\app\outputs\bundle\release\app-release.aab" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "تم الإعداد. لتشغيل التطبيق على هاتف/محاكي:" -ForegroundColor Green
  Write-Host "  flutter run"
  Write-Host "ولبناء نسخة التوزيع:" -ForegroundColor Green
  Write-Host "  .\setup.ps1 -Build"
}
