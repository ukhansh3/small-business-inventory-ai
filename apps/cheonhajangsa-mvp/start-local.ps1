$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$api = $null
try {
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (!$node -or !$npm -or (& $node.Source --version) -notlike 'v24.*') {
        # npm ci replaces node_modules, so keep the runtime in Expo's ignored cache.
        $runtime = Join-Path $PSScriptRoot '.expo/local-runtime'
        $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
        if ($arch -notin @('x64', 'arm64')) { throw "Unsupported Windows architecture: $arch" }
        $nodeHome = Join-Path $runtime "node-win-$arch"
        if (!(Test-Path (Join-Path $nodeHome 'npm.cmd'))) {
            Write-Host 'Downloading Node.js 24 and npm...'
            $base = 'https://nodejs.org/dist/latest-v24.x'
            $manifest = (Invoke-WebRequest -UseBasicParsing "$base/SHASUMS256.txt").Content
            $entry = [regex]::Match($manifest, "(?m)^([a-f0-9]{64})\s+(node-v24\.\d+\.\d+-win-$arch\.zip)\r?$")
            if (!$entry.Success) { throw 'Node.js download was not found in the release manifest.' }
            New-Item -ItemType Directory -Force -Path $runtime | Out-Null
            $archive = Join-Path $runtime $entry.Groups[2].Value
            Invoke-WebRequest -UseBasicParsing "$base/$($entry.Groups[2].Value)" -OutFile $archive
            if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $entry.Groups[1].Value) {
                throw 'Node.js archive checksum mismatch.'
            }
            Expand-Archive -LiteralPath $archive -DestinationPath $runtime -Force
            $expanded = Join-Path $runtime ([IO.Path]::GetFileNameWithoutExtension($archive))
            Move-Item -LiteralPath $expanded -Destination $nodeHome
            Remove-Item -LiteralPath $archive
        }
        $env:Path = "$nodeHome;$env:Path"
        $node = Get-Command node.exe
        $npm = Get-Command npm.cmd
    }

    $lockHash = (Get-FileHash package-lock.json).Hash
    $installStamp = 'node_modules/.local-lock-hash'
    if (!(Test-Path $installStamp) -or (Get-Content $installStamp -Raw).Trim() -ne $lockHash) {
        Write-Host 'Installing app dependencies...'
        & $npm.Source ci --no-audit --no-fund --fetch-retries=0
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Check the npm error above.' }
        Set-Content -LiteralPath $installStamp -Value $lockHash
    }

    if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
    $env:DEV_API_PORT = '8787'
    $env:EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8787'

    $api = Start-Process -FilePath $node.Source -ArgumentList @('--import', 'tsx', 'server/dev-server.ts') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
    Start-Sleep -Seconds 2
    if ($api.HasExited) { throw 'API server exited. Check whether port 8787 is already in use.' }
    & $npm.Source run web -- --localhost --port 8081
    if ($LASTEXITCODE -ne 0) { throw 'Expo web server failed to start.' }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    if ($api -and !$api.HasExited) { Stop-Process -Id $api.Id -ErrorAction SilentlyContinue }
}
