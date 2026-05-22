# ============================================================================
# deploy-deps-only.ps1
# ----------------------------------------------------------------------------
# Gera um ZIP enxuto contendo APENAS:
#   - vendor/         (composer install rodado)
#   - public/build/   (npm run build rodado)
#
# Use quando o servidor já tem o código (via git clone/pull) e você só precisa
# atualizar as dependências PHP ou os assets compilados.
#
# Uso:
#   .\scripts\deploy-deps-only.ps1
#   .\scripts\deploy-deps-only.ps1 -SkipComposer    # só rebuilda assets front
#   .\scripts\deploy-deps-only.ps1 -SkipNpm         # só atualiza vendor PHP
#
# Saída:
#   _release/deps_AAAA-MM-DD_HHMMSS.zip (~5-8 MB)
# ----------------------------------------------------------------------------

param(
    [switch]$SkipComposer,
    [switch]$SkipNpm
)

$ErrorActionPreference = 'Continue'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Assert-LastExitOk($msg) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: $msg (exit $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "=== Deploy deps-only (vendor + public/build) ===" -ForegroundColor Cyan

# 1. composer install
if (-not $SkipComposer) {
    Write-Host "[1/3] composer install --no-dev --optimize-autoloader..." -ForegroundColor Yellow
    cmd /c "composer install --no-dev --optimize-autoloader --no-interaction 2>&1"
    Assert-LastExitOk 'composer install'
}

# 2. npm build
if (-not $SkipNpm) {
    Write-Host "[2/3] npm ci + npm run build..." -ForegroundColor Yellow
    cmd /c "npm ci 2>&1"
    Assert-LastExitOk 'npm ci'

    # Apaga public/hot caso exista
    if (Test-Path 'public/hot') { Remove-Item 'public/hot' -Force }

    cmd /c "npm run build 2>&1"
    Assert-LastExitOk 'npm run build'

    # Apaga public/hot novamente (npm run build não cria mas garantia)
    if (Test-Path 'public/hot') { Remove-Item 'public/hot' -Force }
}

# 3. Empacotar APENAS vendor/ + public/build/
$releaseDir = Join-Path $ProjectRoot '_release'
if (-not (Test-Path $releaseDir)) { New-Item -ItemType Directory -Path $releaseDir | Out-Null }

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$zipPath = Join-Path $releaseDir "deps_$timestamp.zip"

Write-Host "[3/3] Empacotando ZIP em $zipPath..." -ForegroundColor Yellow

# Validações
if (-not (Test-Path 'vendor/autoload.php')) {
    Write-Host "ERRO: vendor/autoload.php nao existe. Rode composer install." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path 'public/build/sw.js')) {
    Write-Host "ERRO: public/build/sw.js nao existe. Rode npm run build." -ForegroundColor Red
    exit 1
}

# Coleta arquivos das 2 pastas (com forward slash p/ Linux)
$allFiles = @()
$allFiles += Get-ChildItem -Path "$ProjectRoot/vendor" -Recurse -File -ErrorAction SilentlyContinue
$allFiles += Get-ChildItem -Path "$ProjectRoot/public/build" -Recurse -File -ErrorAction SilentlyContinue

Write-Host "  $($allFiles.Count) arquivos a empacotar" -ForegroundColor DarkGray

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    foreach ($f in $allFiles) {
        $relPath = $f.FullName.Substring($ProjectRoot.Length + 1) -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $f.FullName, $relPath, [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
} finally {
    $zip.Dispose()
}

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "OK - deps_$timestamp.zip ($zipSize MB)" -ForegroundColor Green
Write-Host ""
Write-Host "No servidor:" -ForegroundColor Cyan
Write-Host "  cd ~/newsga" -ForegroundColor White
Write-Host "  # backup do .env e dos diretorios atuais (se ja existirem)" -ForegroundColor DarkGray
Write-Host "  unzip -o deps_*.zip" -ForegroundColor White
Write-Host "  rm deps_*.zip" -ForegroundColor White
Write-Host "  php artisan optimize:clear; php artisan optimize" -ForegroundColor White
