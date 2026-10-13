param(
    [string]$SuperUser = "postgres",
    [string]$SuperPass = "kannan",
    [string]$HostName = "localhost",
    [int]$Port = 5432
)

$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $PsqlPath)) {
    # Try finding in PATH
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) {
        $PsqlPath = $cmd.Source
    } else {
        Write-Error "psql not found in C:\Program Files\PostgreSQL\18\bin\psql.exe or PATH"
        exit 1
    }
}

$env:PGPASSWORD = $SuperPass
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$initSql = Join-Path (Split-Path -Parent $scriptDir) "database\init-db.sql"

Write-Host "Executing database setup on $HostName`:$Port using $PsqlPath..." -ForegroundColor Cyan
& $PsqlPath -U $SuperUser -h $HostName -p $Port -f $initSql

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database initialization succeeded!" -ForegroundColor Green
} else {
    Write-Error "Database initialization failed with code $LASTEXITCODE"
}
