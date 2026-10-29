# Dengiz saytini Vercel production'ga chiqaradi.
# Avval barcha .js fayllarning sintaksisi tekshiriladi: xato bo'lsa deploy qilinmaydi (jonli sayt buzilmasin).
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$bad = 0
Get-ChildItem -Recurse -Filter *.js | Where-Object { $_.FullName -notmatch '\\(node_modules|\.vercel)\\' } | ForEach-Object {
  node --check $_.FullName 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host "SINTAKSIS XATO: $($_.FullName)" -ForegroundColor Red; $bad++ }
}
if ($bad) { Write-Host "Deploy to'xtatildi ($bad ta fayl xato)." -ForegroundColor Red; exit 1 }
Write-Host "Sintaksis tekshiruvi o'tdi." -ForegroundColor Green

npx --yes vercel@latest deploy --prod --yes
