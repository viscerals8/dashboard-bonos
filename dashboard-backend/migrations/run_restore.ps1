param(
    [string]$ServerInstance = "192.168.10.6",
    [string]$UserName = "sa",
    [Parameter(Mandatory = $true)]
    [string]$Password,
    [switch]$Restart
)

$ChunkDir = Join-Path $PSScriptRoot "export_chunks"
$OrderFile = Join-Path $ChunkDir "00_ORDEN_DE_EJECUCION.txt"
$ProgressFile = Join-Path $ChunkDir "_progress.txt"

if (-not (Test-Path $OrderFile)) {
    Write-Host "No se encontro $OrderFile" -ForegroundColor Red
    exit 1
}

$files = Get-Content $OrderFile | Where-Object { $_ -match '\.sql$' }

if ($Restart -and (Test-Path $ProgressFile)) {
    Remove-Item $ProgressFile -Force
}

$startIndex = 0
if (Test-Path $ProgressFile) {
    $lastDone = Get-Content $ProgressFile -Tail 1
    if ($lastDone) {
        $idx = [array]::IndexOf($files, $lastDone.Trim())
        if ($idx -ge 0) {
            $startIndex = $idx + 1
            Write-Host "Retomando despues de '$lastDone' (archivo $($idx+1) de $($files.Count))." -ForegroundColor Yellow
        }
    }
}

$total = $files.Count
for ($i = $startIndex; $i -lt $total; $i++) {
    $f = $files[$i]
    $path = Join-Path $ChunkDir $f
    if (-not (Test-Path $path)) {
        Write-Host "[$($i+1)/$total] $f no existe, se omite (verifica el nombre)." -ForegroundColor Yellow
        continue
    }
    Write-Host "[$($i+1)/$total] Ejecutando $f ..."
    & sqlcmd -S $ServerInstance -U $UserName -P $Password -i $path -b
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "FALLO en '$f' (archivo $($i+1) de $total)." -ForegroundColor Red
        Write-Host "Corrige el problema y vuelve a correr este mismo script: retomara justo despues del ultimo archivo exitoso." -ForegroundColor Red
        exit 1
    }
    Add-Content -Path $ProgressFile -Value $f
}

Write-Host ""
Write-Host "Listo. Los $total archivos se ejecutaron correctamente." -ForegroundColor Green
