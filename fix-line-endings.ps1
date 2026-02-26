Write-Host "Normalising all .sh files to LF..."

$files = Get-ChildItem -Path .\infra -Recurse -Filter *.sh

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $fixed = $content -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($file.FullName, $fixed, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Fixed:" $file.FullName
}

Write-Host "Verification:"
foreach ($file in $files) {
    $raw = [System.IO.File]::ReadAllText($file.FullName)
    if ($raw.Contains("`r")) {
        Write-Host "CR still found in" $file.FullName -ForegroundColor Red
    } else {
        Write-Host "OK:" $file.FullName -ForegroundColor Green
    }
}

Write-Host "LF normalisation complete."
