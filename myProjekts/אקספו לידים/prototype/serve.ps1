# Local-only static server for the expo prototype. Serves two folders, nothing else.
$root = "C:\Users\user"
$allowed = @("expo-data/", "claude/myProjekts/אקספו לידים/prototype/", "claude/myProjekts/אקספו לידים/prototype-v3/")
$types = @{ ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".css" = "text/css; charset=utf-8" }
$l = New-Object System.Net.HttpListener
$port = $(if ($env:PORT) { $env:PORT } else { "8765" })
$l.Prefixes.Add("http://localhost:$port/")
$l.Start()
Write-Host "serving on http://localhost:$port/"
while ($l.IsListening) {
  $ctx = $l.GetContext()
  $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  $ok = $false; foreach ($a in $allowed) { if ($rel.StartsWith($a)) { $ok = $true } }
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
  if ($ok -and $full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $ext = [System.IO.Path]::GetExtension($full)
    $ctx.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" })
    $ctx.Response.Headers.Add("Cache-Control", "no-store")
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
