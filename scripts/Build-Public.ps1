[CmdletBinding()]
param(
    # Optional unchanged resources/recovery directory from official v3.2.3.
    [string]$RecoveryDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT' -or ![Environment]::Is64BitOperatingSystem) {
    throw 'This build script requires Windows x64.'
}

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourceDir = Join-Path $projectRoot 'source'
$outputDir = Join-Path $projectRoot 'app-build\win-unpacked'
$recoveryOutputDir = Join-Path $sourceDir 'build\recovery'

foreach ($target in @($sourceDir, $outputDir, $recoveryOutputDir)) {
    if (![IO.Path]::GetFullPath($target).StartsWith($projectRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Build path is outside this repository: $target"
    }
}

foreach ($required in @('source\package-lock.json', 'source\recovery\Cargo.lock', 'source\.cargo\config.toml', 'translation\part-0-ru.json')) {
    if (!(Test-Path -LiteralPath (Join-Path $projectRoot $required) -PathType Leaf)) {
        throw "Required source file is missing: $required"
    }
}

if (Test-Path -LiteralPath (Join-Path $outputDir 'user-data')) {
    throw 'The build output contains a user-data profile. Move the complete application folder to a permanent location before rebuilding.'
}
if (Get-Process | Where-Object { $_.Path -eq (Join-Path $outputDir 'Open-Git-Control.exe') }) {
    throw 'Close the application running from app-build/win-unpacked before rebuilding.'
}

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$npmCommand = Get-Command npm.cmd -ErrorAction Stop
$nodeVersionText = & $nodeCommand.Source -p 'process.versions.node'
if ($LASTEXITCODE -ne 0) { throw 'Cannot read the installed Node.js version.' }
$nodeVersion = [version]$nodeVersionText
if ($nodeVersion.Major -ne 22 -or $nodeVersion -lt [version]'22.23.5') {
    throw 'Install Node.js 22.23.5 x64 or a later patch of Node.js 22, including npm.'
}
$nodeArch = & $nodeCommand.Source -p 'process.arch'
if ($LASTEXITCODE -ne 0 -or $nodeArch -ne 'x64') { throw 'The installed Node.js must be x64.' }

$verifiedRecovery = @()
if ($RecoveryDirectory) {
    $recoveryInputDir = (Resolve-Path -LiteralPath $RecoveryDirectory -ErrorAction Stop).Path
    $expectedHashes = [ordered]@{
        'Open-Git-Control-Recovery.exe' = '1ecf6e0c91acd1b34a8bdbc473c8b5d897d6078c1606598965c1d1c68daac75b'
        'LICENSE' = '3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986'
        'THIRD_PARTY_NOTICES.txt' = 'e7930410ca8ec972254488edfdd2684ba2a33b65091a9e8f4522ab34aec1b3db'
    }
    foreach ($name in $expectedHashes.Keys) {
        $file = Join-Path $recoveryInputDir $name
        if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "Recovery input is missing $name" }
        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $expectedHashes[$name]) {
            throw "Recovery input does not match official v3.2.3: $name"
        }
        $verifiedRecovery += $file
    }
} else {
    $null = Get-Command cargo.exe -ErrorAction Stop
    $null = Get-Command rustup.exe -ErrorAction Stop
}

function Invoke-Checked([scriptblock]$Action) {
    & $Action
    if ($LASTEXITCODE -ne 0) { throw "Build command failed with exit code $LASTEXITCODE" }
}

$savedElectronCache = $env:ELECTRON_CACHE
$savedBuilderCache = $env:ELECTRON_BUILDER_CACHE
$savedRustToolchain = $env:RUSTUP_TOOLCHAIN
try {
    $env:ELECTRON_CACHE = Join-Path $projectRoot 'build-cache\electron'
    $env:ELECTRON_BUILDER_CACHE = Join-Path $projectRoot 'build-cache\builder'
    $env:RUSTUP_TOOLCHAIN = '1.93.1'

    Push-Location $sourceDir
    try {
        if (!$RecoveryDirectory) {
            Invoke-Checked { cargo.exe --version }
        }
        Invoke-Checked { & $npmCommand.Source ci }
        Invoke-Checked { & $nodeCommand.Source scripts/assemble-russian-locale.cjs }
        Invoke-Checked { & $npmCommand.Source run legal:prepare }

        if ($RecoveryDirectory) {
            $null = New-Item -Path $recoveryOutputDir -ItemType Directory -Force
            foreach ($file in $verifiedRecovery) {
                $destination = Join-Path $recoveryOutputDir ([IO.Path]::GetFileName($file))
                if (![IO.Path]::GetFullPath($file).Equals([IO.Path]::GetFullPath($destination), [StringComparison]::OrdinalIgnoreCase)) {
                    Copy-Item -LiteralPath $file -Destination $destination -Force
                }
            }
        } else {
            Invoke-Checked { & $npmCommand.Source run recovery:build }
        }

        Invoke-Checked { & $npmCommand.Source run build }
        Invoke-Checked { & $nodeCommand.Source scripts/build-russian-dir.cjs }
        foreach ($required in @('Open-Git-Control.exe', 'resources\app.asar', 'Open-Git-Control-Recovery.exe', 'resources\LICENSE', 'resources\THIRD_PARTY_NOTICES.txt')) {
            if (!(Test-Path -LiteralPath (Join-Path $outputDir $required) -PathType Leaf)) {
                throw "The build is missing $required"
            }
        }
        Write-Output "Build ready: $(Join-Path $outputDir 'Open-Git-Control.exe')"
    } finally {
        Pop-Location
    }
} finally {
    $env:ELECTRON_CACHE = $savedElectronCache
    $env:ELECTRON_BUILDER_CACHE = $savedBuilderCache
    $env:RUSTUP_TOOLCHAIN = $savedRustToolchain
}
