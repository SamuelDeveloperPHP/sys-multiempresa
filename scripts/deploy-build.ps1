# ============================================================================
# deploy-build.ps1
# ----------------------------------------------------------------------------
# Builda a aplicacao LOCALMENTE (Windows) e empacota um ZIP pronto para
# upload no servidor cPanel/shared hosting que NAO tem composer/npm.
#
# Uso:
#   .\scripts\deploy-build.ps1
#   .\scripts\deploy-build.ps1 -SkipComposer   # se vendor ja esta atualizado
#   .\scripts\deploy-build.ps1 -SkipNpm        # se public/build ja esta atualizado
#
# Saida:
#   _release/release_YYYY-MM-DD_HHMMSS.zip
# ----------------------------------------------------------------------------

param(
    [switch]$SkipComposer,
    [switch]$SkipNpm,
    [switch]$SkipZip
)

# composer/npm escrevem info no stderr — nao tratar como erro
$ErrorActionPreference = 'Continue'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Helper: para somente em erros REAIS de comando (exit code != 0)
function Assert-LastExitOk($msg) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: $msg (exit $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "=== Deploy Build sys-multiempresa ===" -ForegroundColor Cyan
Write-Host "Projeto: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

# ----------------------------------------------------------------------------
# 1. Composer install (producao - sem dev deps + optimize)
# ----------------------------------------------------------------------------
if (-not $SkipComposer) {
    Write-Host "[1/4] composer install --no-dev --optimize-autoloader..." -ForegroundColor Yellow
    cmd /c "composer install --no-dev --optimize-autoloader --no-interaction 2>&1"
    Assert-LastExitOk 'composer install'
} else {
    Write-Host "[1/4] composer install SKIPPED" -ForegroundColor DarkGray
}

# ----------------------------------------------------------------------------
# 2. npm ci + build
# ----------------------------------------------------------------------------
if (-not $SkipNpm) {
    Write-Host "[2/4] npm ci..." -ForegroundColor Yellow
    cmd /c "npm ci 2>&1"
    Assert-LastExitOk 'npm ci'

    Write-Host "[2.5/4] npm run build..." -ForegroundColor Yellow
    cmd /c "npm run build 2>&1"
    Assert-LastExitOk 'npm run build'
} else {
    Write-Host "[2/4] npm ci + build SKIPPED" -ForegroundColor DarkGray
}

# ----------------------------------------------------------------------------
# 3. Limpa caches Laravel (eles serao regerados no servidor)
# ----------------------------------------------------------------------------
Write-Host "[3/4] Limpando caches Laravel..." -ForegroundColor Yellow
cmd /c "php artisan config:clear 2>&1" | Out-Null
cmd /c "php artisan route:clear 2>&1" | Out-Null
cmd /c "php artisan view:clear 2>&1" | Out-Null
cmd /c "php artisan cache:clear 2>&1" | Out-Null

# CRITICO: public/hot e criado por `npm run dev` e diz ao Laravel usar Vite dev
# server (http://[::1]:5173). Se ficar em prod, todos os assets dao CORS/404.
if (Test-Path 'public/hot') {
    Remove-Item 'public/hot' -Force
    Write-Host "  public/hot removido (dev marker)" -ForegroundColor DarkGray
}

Write-Host "OK" -ForegroundColor Green

# ----------------------------------------------------------------------------
# 4. Empacotar ZIP de release
# ----------------------------------------------------------------------------
if (-not $SkipZip) {
    $releaseDir = Join-Path $ProjectRoot '_release'
    if (-not (Test-Path $releaseDir)) { New-Item -ItemType Directory -Path $releaseDir | Out-Null }

    $timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
    $zipName = "release_$timestamp.zip"
    $zipPath = Join-Path $releaseDir $zipName

    Write-Host "[4/4] Empacotando ZIP em $zipPath..." -ForegroundColor Yellow

    # Fail-fast: vendor/ tem que existir
    if (-not (Test-Path 'vendor/autoload.php')) {
        throw "vendor/autoload.php nao existe. Rode primeiro: composer install --no-dev --optimize-autoloader"
    }
    if (-not (Test-Path 'public/build/manifest.json') -and -not (Test-Path 'public/build/.vite/manifest.json')) {
        throw "public/build/ nao existe. Rode primeiro: npm ci && npm run build"
    }

    # Pastas/arquivos a EXCLUIR do zip (regex contra path relativo c/ forward slash)
    $excludePatterns = @(
        '\.git', '\.github', '\.idea', '\.vscode', '\.claude',
        'node_modules', '_release', 'tests',
        'public/hot',  # marker do Vite dev server — JAMAIS deve ir pra prod
        '\.env', '\.env\.production', '\.env\.staging', '\.env\.backup', '\.env\.local',
        '\.gitignore', '\.editorconfig',
        '\.phpunit\.cache', 'phpunit\.xml',
        'storage/logs/.*\.log',
        'storage/framework/cache/data/.+',
        'storage/framework/sessions/.+',
        'storage/framework/views/.+',
        'README\.md', 'CHANGELOG\.md',
        # Arquivos de dev/build que nao precisam em prod
        'package-lock\.json', 'vite\.config\.js', 'tailwind\.config\.js',
        'postcss\.config\.js', 'tsconfig\.json',
        'resources/js/.*', 'resources/css/.*',
        # IMPORTANTE: resources/views/* sao necessarias (Blade + emails) — NAO excluir
        '_release/.*'
    )

    # Compila lista de tudo no projeto
    Write-Host "  Coletando arquivos..." -ForegroundColor DarkGray
    $allFiles = Get-ChildItem -Path $ProjectRoot -Recurse -File -ErrorAction SilentlyContinue `
        | Where-Object { $_.FullName -notlike '*\.git\*' -and $_.FullName -notlike '*\node_modules\*' -and $_.FullName -notlike '*\.claude\*' -and $_.FullName -notlike '*\_release\*' } `
        | Where-Object {
            $rel = $_.FullName.Substring($ProjectRoot.Length + 1) -replace '\\', '/'
            if ($rel -match '\.log$') { return $false }
            $skip = $false
            foreach ($pat in $excludePatterns) {
                if ($rel -match "^$pat$" -or $rel -match "^$pat/" -or $rel -match "/$pat$" -or $rel -match "/$pat/") {
                    $skip = $true
                    break
                }
            }
            -not $skip
        }

    Write-Host "  $($allFiles.Count) arquivos a empacotar" -ForegroundColor DarkGray

    # Validacao: confirma que vendor esta na lista
    $vendorCount = ($allFiles | Where-Object { $_.FullName -like '*\vendor\*' }).Count
    if ($vendorCount -eq 0) {
        throw "Bug: nenhum arquivo do vendor/ foi incluido. Abortando para evitar release quebrada."
    }
    Write-Host "  - vendor/: $vendorCount arquivos" -ForegroundColor DarkGray

    # Cria zip usando .NET (mais rapido que Compress-Archive)
    # CRITICO: paths das entries devem usar FORWARD SLASH (/) para o Linux extrair corretamente.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
    try {
        foreach ($f in $allFiles) {
            # Converte backslash do Windows para forward slash do Linux/zip standard
            $relPath = $f.FullName.Substring($ProjectRoot.Length + 1) -replace '\\', '/'
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $f.FullName, $relPath, [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    } finally {
        $zip.Dispose()
    }

    $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Write-Host "OK - $zipName ($zipSize MB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Arquivo pronto:" -ForegroundColor Cyan
    Write-Host "  $zipPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Cyan
    Write-Host "  1) Acesse cPanel -> File Manager" -ForegroundColor White
    Write-Host "  2) Va para o diretorio do projeto (ex: ~/newsga)" -ForegroundColor White
    Write-Host "  3) Faca upload do ZIP" -ForegroundColor White
    Write-Host "  4) Use Extract no proprio File Manager" -ForegroundColor White
    Write-Host "  5) Via SSH: cd ~/newsga && php artisan migrate --force" -ForegroundColor White
    Write-Host "  6) Veja docs/DEPLOY.md para detalhes" -ForegroundColor White
} else {
    Write-Host "[4/4] ZIP SKIPPED" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== Build concluido ===" -ForegroundColor Green
