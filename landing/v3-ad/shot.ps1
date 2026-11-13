# Headless-Chrome screenshot helper:  .\shot.ps1 <out.png> <relative-url-with-query> <width> <height> [budget-ms]
param([string]$Out, [string]$Rel, [int]$W = 1440, [int]$H = 900, [int]$Budget = 6000)
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$base = ($PSScriptRoot -replace '\\', '/') -replace ' ', '%20'
$url = "file:///$base/$Rel"
$outPath = Join-Path $PSScriptRoot $Out
New-Item -ItemType Directory -Force (Split-Path $outPath) | Out-Null
$p = Start-Process -FilePath $chrome -ArgumentList @("--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=$W,$H", "--virtual-time-budget=$Budget", "--screenshot=`"$outPath`"", "`"$url`"") -PassThru -WindowStyle Hidden
$p.WaitForExit(60000) | Out-Null
if (Test-Path $outPath) { "ok $Out" } else { "FAILED $Out" }
