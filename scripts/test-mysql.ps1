param(
    [Parameter(Mandatory)][string]$MysqlBin,
    [switch]$EnsaiarRestauracao,
    [string]$Filtro
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
    New-Item -ItemType Directory -Path $settings.LARAVEL_STORAGE_PATH | Out-Null
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
        # No Windows PowerShell 5.1, stderr de comando nativo vira erro fatal sob 'Stop', mesmo com 2>$null.
        $ErrorActionPreference = 'Continue'
        $instance = & $dbClient @clientArgs -N -e 'SELECT @@datadir' 2>$null
        $ErrorActionPreference = 'Stop'
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
    $selecao = @()
    if ($Filtro) { $selecao = @('--filter', $Filtro) }
    & php vendor/bin/phpunit --do-not-cache-result @selecao tests/Unit @features tests/Homologacao
    if ($LASTEXITCODE) { throw 'Testes de homologação falharam.' }
    if ($EnsaiarRestauracao) {
        $dump = Join-Path $scratch 'operacao.sql'
        & (Join-Path $bin 'mysqldump.exe') @clientArgs --single-transaction --no-tablespaces "--result-file=$dump" frota_qa
        if ($LASTEXITCODE) { throw 'Falha ao copiar a base de homologação.' }
        & $dbClient @clientArgs -e 'CREATE DATABASE frota_restaurada CHARACTER SET utf8mb4'
        if ($LASTEXITCODE) { throw 'Falha ao criar o banco de destino da restauração.' }
        $dumpSqlPath = $dump.Replace('\', '/')
        & $dbClient @clientArgs frota_restaurada -e "source $dumpSqlPath"
        if ($LASTEXITCODE) { throw 'Falha ao restaurar a cópia.' }
        $consultas = @(
            'SELECT veiculo_id, data_inicio, data_prevista, data_fim FROM veiculos_locacaos ORDER BY id',
            'SELECT company_id, obra_id, produto_id, variante_id, quantidade FROM estoque_saldos ORDER BY id',
            'SELECT numero, status, movimentacao_saida_id, movimentacao_gerada_id FROM estoque_devolucoes ORDER BY id',
            'SELECT numero, status, qtd_itens_divergentes FROM estoque_inventarios ORDER BY id'
        )
        foreach ($consulta in $consultas) {
            $origem = @(& $dbClient @clientArgs -NB frota_qa -e $consulta)
            if ($LASTEXITCODE -or !$origem.Count) { throw 'Dados operacionais ausentes na origem.' }
            $restaurado = @(& $dbClient @clientArgs -NB frota_restaurada -e $consulta)
            if ($LASTEXITCODE -or ($origem -join "`n") -cne ($restaurado -join "`n")) { throw 'Divergência após restauração.' }
        }
        Write-Output 'Restauração conferida: períodos de locação, saldos por variante, devoluções e inventários.'
    }
} finally {
    if ($server -and !$server.HasExited) {
        if ($ready) {
            & (Join-Path $bin 'mysqladmin.exe') @clientArgs shutdown
        }
        # Process.Kill($true) só existe no PowerShell 7; Stop-Process funciona nas duas versões.
        if (!$server.WaitForExit(10000)) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue; $server.WaitForExit() }
    }
    # Encerra qualquer mysqld que ainda aponte para a pasta temporária desta execução.
    Get-CimInstance Win32_Process -Filter "Name = 'mysqld.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains($scratch) } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
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
