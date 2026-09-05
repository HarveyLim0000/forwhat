# Inline CSS/JS into index.html to produce a single-file build.
#   .\build-single.ps1  ->  dist\lifetime-recorder.html
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$html = Get-Content (Join-Path $root 'index.html') -Raw -Encoding UTF8

$css = Get-Content (Join-Path $root 'assets\css\app.css') -Raw -Encoding UTF8
$html = $html.Replace('<link rel="stylesheet" href="assets/css/app.css">', "<style>`n$css`n</style>")

$scripts = @(
  'data.js', 'store.js', 'ui.js',
  'screens-today.js', 'screens-review.js', 'screens-memory.js',
  'screens-growth.js', 'screens-me.js', 'app.js'
)
foreach ($s in $scripts) {
  $js = Get-Content (Join-Path $root "assets\js\$s") -Raw -Encoding UTF8
  $html = $html.Replace("<script src=`"assets/js/$s`"></script>", "<script>`n$js`n</script>")
}

$dist = Join-Path $root 'dist'
if (-not (Test-Path $dist)) { New-Item -ItemType Directory $dist | Out-Null }
$out = Join-Path $dist 'lifetime-recorder.html'
[System.IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding $false))

$kb = [math]::Round((Get-Item $out).Length / 1KB, 1)
"built: $out ($kb KB)"
