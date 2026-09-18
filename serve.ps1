# RewardPK - Local Development & Production Server
$port = 8080
$path = $PSScriptRoot
$dbFile = Join-Path $path "data\database.json"

if (-not (Test-Path (Join-Path $path "data"))) {
    New-Item -ItemType Directory -Path (Join-Path $path "data") | Out-Null
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "=========================================================="
Write-Host " RewardPK - Gift Cards & Rewards Platform Server Running"
Write-Host " Access platform at: http://localhost:$port/"
Write-Host "=========================================================="

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Add CORS headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $localPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($localPath)) {
            $localPath = "index.html"
        }

        # API Routes
        if ($localPath -eq "api/state") {
            if ($request.HttpMethod -eq "GET") {
                if (Test-Path $dbFile) {
                    $bytes = [System.IO.File]::ReadAllBytes($dbFile)
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $bytes.Length
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } else {
                    $response.StatusCode = 404
                    $msg = '{"error": "Database not initialized"}'
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } elseif ($request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $body = $reader.ReadToEnd()
                [System.IO.File]::WriteAllText($dbFile, $body, [System.Text.Encoding]::UTF8)
                
                $response.ContentType = "application/json; charset=utf-8"
                $msg = '{"success": true, "message": "Database saved successfully"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            $response.Close()
            continue
        }

        # Serve static file
        $filePath = Join-Path $path $localPath
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".png"  { "image/png" }
                ".svg"  { "image/svg+xml" }
                ".webp" { "image/webp" }
                default { "application/octet-stream" }
            }

            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # SPA Fallback for HTML routes
            $indexFile = Join-Path $path "index.html"
            if (Test-Path $indexFile) {
                $bytes = [System.IO.File]::ReadAllBytes($indexFile)
                $response.ContentType = "text/html; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $msg = "404 - File Not Found"
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
