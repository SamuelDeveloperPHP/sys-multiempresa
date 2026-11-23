param(
    [Parameter(Mandatory)][string]$MysqlBin
)
$ErrorActionPreference = 'Stop'
$bin = (Resolve-Path -LiteralPath $MysqlBin).Path
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$tempRoot = Join-Path $project 'storage/framework/testing'
if ($project -match '(?i)[\\/]OneDrive(?: - [^\\/]+)?(?:[\\/]|$)') { throw 'Use um projeto local fora do OneDrive.' }
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
$tempRoot = (Resolve-Path -LiteralPath $tempRoot).Path
$scratch = Join-Path $tempRoot ('sys-frota-qa-' + [guid]::NewGuid().ToString('N'))
$dbServer = Join-Path $bin 'mysqld.exe'
$dbClient = Join-Path $bin 'mysql.exe'
$settings = @{
    APP_ENV = 'testing'
    DB_CONNECTION = 'mysql'
    DB_HOST = '127.0.0.1'
    DB_DATABASE = 'frota_qa'
    DB_USERNAME = 'root'
    DB_PASSWORD = [guid]::NewGuid().ToString('N')
    DB_URL = ''
    DB_SOCKET = ''
    APP_CONFIG_CACHE = (Join-Path $scratch 'uncached-config.php')
    VIEW_COMPILED_PATH = (Join-Path $scratch 'views')
    LARAVEL_STORAGE_PATH = (Join-Path $scratch 'storage')
}
$previous = @{}
$server = $null
Push-Location $project
try {
    New-Item -ItemType Directory -Path $scratch | Out-Null
    New-Item -ItemType Directory -Path $settings.VIEW_COMPILED_PATH | Out-Null
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    $listener.Stop()
    $settings.DB_PORT = [string]$port
    $settings.DB_URL = "mysql://root:$($settings.DB_PASSWORD)@127.0.0.1:$port/frota_qa"
    foreach ($key in $settings.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key)
        [Environment]::SetEnvironmentVariable($key, $settings[$key])
    }
    $data = Join-Path $scratch 'data'
    & $dbServer --no-defaults --initialize-insecure "--datadir=$data"
    if ($LASTEXITCODE) { throw 'Falha ao inicializar a instância descartável.' }
    $initFile = Join-Path $scratch 'init.sql'
    $clientFile = Join-Path $scratch 'client.cnf'
    Set-Content -LiteralPath $initFile -Encoding ascii -Value "ALTER USER 'root'@'localhost' IDENTIFIED BY '$($settings.DB_PASSWORD)';"
    Set-Content -LiteralPath $clientFile -Encoding ascii -Value @('[client]', "password=$($settings.DB_PASSWORD)")
    $server = Start-Process $dbServer -WindowStyle Hidden -PassThru -ArgumentList @(
        '--no-defaults', ('"--datadir=' + $data + '"'), "--port=$port",
        ('"--init-file=' + $initFile + '"'),
        '--bind-address=127.0.0.1', '--mysqlx=OFF', '--skip-log-bin'
    )
    $clientArgs = @("--defaults-file=$clientFile", '--protocol=TCP', '-h127.0.0.1', "-P$port", '-uroot')
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($server.HasExited) { throw 'O MySQL de teste encerrou durante a inicialização.' }
        $instance = & $dbClient @clientArgs -N -e 'SELECT @@datadir' 2>$null
        if ($LASTEXITCODE -eq 0) {
            $ready = [IO.Path]::GetFullPath($instance).TrimEnd('\') -eq $data
            break
        }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'A conexão não corresponde à instância descartável criada.' }
    & $dbClient @clientArgs -e 'CREATE DATABASE frota_qa CHARACTER SET utf8mb4'
    if ($LASTEXITCODE) { throw 'Falha ao preparar a base isolada.' }
    # Somente Feature/Mobile monta seu próprio esquema simplificado. Os fluxos
    # móveis contra migrations reais têm cobertura específica em Homologacao.
    $features = Get-ChildItem -LiteralPath tests/Feature | Where-Object Name -ne 'Mobile' | ForEach-Object FullName
    & php vendor/bin/phpunit --do-not-cache-result tests/Unit @features tests/Homologacao
    if ($LASTEXITCODE) { throw 'Testes de homologação falharam.' }
} finally {
    if ($server -and !$server.HasExited) {
        if ($ready) {
            & (Join-Path $bin 'mysqladmin.exe') @clientArgs shutdown
        }
        if (!$server.WaitForExit(10000)) { $server.Kill($true); $server.WaitForExit() }
    }
    foreach ($key in $previous.Keys) {
        [Environment]::SetEnvironmentVariable($key, $previous[$key])
    }
    $resolved = [IO.Path]::GetFullPath($scratch)
    if ([IO.Path]::GetDirectoryName($resolved) -eq $tempRoot.TrimEnd('\') -and
        [IO.Path]::GetFileName($resolved) -match '^sys-frota-qa-[a-f0-9]{32}$' -and
        (Test-Path -LiteralPath $resolved)) {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
    Pop-Location
}
