[CmdletBinding()]
param(
    [ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+-ru\.[0-9]+$')]
    [string]$Version = '3.2.3-ru.1'
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
# Never package the runnable app/ directory: it contains the user's profile.
$buildRoot = Join-Path $projectRoot 'app-build\win-unpacked'
$outputRoot = Join-Path $projectRoot 'distribution'
$archiveRoot = "Open-Git-Control-$Version-win-x64"
$archiveName = "$archiveRoot-portable.zip"
$archivePath = Join-Path $outputRoot $archiveName
$docsRoot = Join-Path $outputRoot "$archiveRoot-docs"
foreach ($target in @($buildRoot,$outputRoot,$docsRoot,$archivePath)) {
    if (![IO.Path]::GetFullPath($target).StartsWith($projectRoot+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Release path escapes the project.' }
}
if (!(Test-Path -LiteralPath $buildRoot -PathType Container)) { throw 'Build app-build/win-unpacked first.' }
if (Test-Path -LiteralPath $archivePath) { throw "Release archive already exists: $archiveName. Keep it or select another release version." }
if (Test-Path -LiteralPath $docsRoot) { throw 'Release documentation staging already exists; inspect it before another run.' }
$forbidden = '(?i)(^|/)(user-data|userdata|profiles?|\.git|\.env(?:\.[^/]*)?|logs?|cookies|login data|local storage|session storage|indexeddb|crashpad)(/|$)|(?i)(^|/)(credentials?|tokens?|auth|settings|accounts?|hosting-accounts|run-approvals)\.(json|db|sqlite)$|(?i)\.(log|dmp|tmp|part)$'
$files = [Collections.Generic.List[object]]::new()
function Add-PublicFile([string]$Source,[string]$Relative) {
    $relativeName = $Relative.Replace('\','/')
    if ($relativeName -match $forbidden -or $relativeName -match '(^|/)\.\.(/|$)' -or $relativeName.StartsWith('/')) { throw "Private or unsafe release path: $relativeName" }
    $item = Get-Item -LiteralPath $Source -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked file is not allowed: $relativeName" }
    $files.Add([pscustomobject]@{Source=$item.FullName;Path=$relativeName;Bytes=$item.Length;SHA256=(Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()})
}
function Add-BuildTree([string]$Directory) {
    foreach ($item in Get-ChildItem -LiteralPath $Directory -Force) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked files or directories are not allowed in the release.' }
        $relativeName = $item.FullName.Substring($buildRoot.Length+1).Replace('\','/')
        if ($relativeName -match $forbidden) { throw "Private state in build output: $relativeName" }
        if ($item.PSIsContainer) { Add-BuildTree $item.FullName }
        else { Add-PublicFile $item.FullName ('app/'+$relativeName) }
    }
}
Add-BuildTree $buildRoot
foreach ($required in @('app/Open-Git-Control.exe','app/resources/app.asar','app/resources/LICENSE','app/resources/THIRD_PARTY_NOTICES.txt','app/resources/recovery/THIRD_PARTY_NOTICES.txt')) {
    if ($files.Path -notcontains $required) { throw "Missing required release file: $required" }
}
$launcher = Join-Path $projectRoot 'Start-Open-Git-Control-RU.cmd'
$launcherBytes = [IO.File]::ReadAllBytes($launcher)
$launcherText = [Text.Encoding]::UTF8.GetString($launcherBytes)
if ($launcherText -match '(?<!\r)\n' -or $launcherText.StartsWith([char]0xfeff)) { throw 'CMD launcher must be UTF-8 without BOM and use CRLF line endings.' }
Add-PublicFile $launcher 'Start-Open-Git-Control-RU.cmd'
Add-PublicFile (Join-Path $buildRoot 'resources\LICENSE') 'LICENSE'
$null = New-Item -ItemType Directory -Path $docsRoot
$readme = @'
Open Git Control 3.2.3 — English (Русский)
Community localization release VERSION_PLACEHOLDER — Windows x64 portable

УСТАНОВКА И ЗАПУСК
1. Распакуйте весь ZIP в отдельную папку с правом записи. Не запускайте программу из окна архива.
2. Откройте Start-Open-Git-Control-RU.cmd. Можно также запустить app\Open-Git-Control.exe напрямую.
3. Для операций с репозиториями установите Git for Windows: https://git-scm.com/downloads/win
Node.js, npm и Python для запуска готового приложения устанавливать не требуется.

ИНТЕРФЕЙС
По умолчанию показаны английские надписи с русским переводом в скобках:
Settings (Настройки), Commit (Коммит). Язык меняется в Settings → General → Language.
Имена веток, файлов, сообщения коммитов и технический вывод Git не переводятся.
Отдельная утилита Recovery взята из официального релиза и не переведена.
Настройки языка генерируемых ИИ описаний релизов остаются штатными de/en.

ДАННЫЕ И ВХОД В GITHUB
Архив не содержит пользовательского профиля, подключений и токенов. При первом запуске
приложение создаёт профиль app\user-data рядом с исполняемым файлом.
Войдите самостоятельно через Hosting → Accounts & servers → Add connection → GitHub.
Доступны личный токен, настроенный OAuth Device Flow и импорт входа GitHub CLI (gh).
После входа храните папку app\user-data как личные данные; не включайте её в публичные архивы.
Для обновления сохраняйте существующий профиль отдельно. Этот архив создаёт чистую копию приложения.

ПРОИСХОЖДЕНИЕ И ИСХОДНИКИ
Это независимая локализованная сборка, а не официальный релиз авторов Open-Git-Control.
Основа: https://github.com/timbornemann/Open-Git-Control
Коммит: 99e475f40a5497e971fa212014ffabe092c4ef78 (версия 3.2.3).
Соответствующие исходники и инструкции сборки опубликованы в том же GitHub-репозитории,
из которого скачан этот релиз, под тегом vVERSION_PLACEHOLDER.
Лицензия GPL-3.0-only: LICENSE. Уведомления зависимостей:
app\resources\THIRD_PARTY_NOTICES.txt и app\resources\recovery\THIRD_PARTY_NOTICES.txt.
Сведения о компонентах и SHA-256 файлов: release-manifest.json.

ПРОВЕРКА И ОГРАНИЧЕНИЯ
Запуск и двуязычный интерфейс проверены на компьютере сборки. Запуск на другом компьютере
пока не проверен. Официальные автообновления отключены, чтобы не заменить эту локализацию.
Подключение AgentAI не включено. Штатный локальный API планировщика не предоставляет
агентам полный доступ к операциям Git и GitHub.
'@
$readme = $readme.Replace('VERSION_PLACEHOLDER',$Version).Replace("`r`n","`n").Replace("`n","`r`n") + "`r`n"
$readmePath = Join-Path $docsRoot 'README-RU.txt'
[IO.File]::WriteAllText($readmePath,$readme,[Text.UTF8Encoding]::new($false))
Add-PublicFile $readmePath 'README-RU.txt'
$identity = $files | Where-Object Path -eq 'app/resources/app.asar' | Select-Object Path,Bytes,SHA256
$manifest = [ordered]@{
    schemaVersion=1
    application='Open Git Control RU'
    version=$Version
    tag="v$Version"
    platform='windows-x64'
    displayMode='English (Russian)'
    upstreamRepository='https://github.com/timbornemann/Open-Git-Control'
    upstreamCommit='99e475f40a5497e971fa212014ffabe092c4ef78'
    license='GPL-3.0-only'
    source='Corresponding source and build instructions are distributed in the publishing repository under this release tag.'
    profileIncluded=$false
    recoveryHelper='Unmodified official upstream v3.2.3; not localized'
    verification='Native launch and bilingual UI verified on the build computer; other-computer runtime not tested.'
    files=@($files | Sort-Object Path | Select-Object Path,Bytes,SHA256)
}
$manifestPath = Join-Path $docsRoot 'release-manifest.json'
[IO.File]::WriteAllText($manifestPath,($manifest | ConvertTo-Json -Depth 6)+"`n",[Text.UTF8Encoding]::new($false))
Add-PublicFile $manifestPath 'release-manifest.json'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($archivePath,[IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files | Sort-Object Path) {
        $null = [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.Source,"$archiveRoot/$($file.Path)",[IO.Compression.CompressionLevel]::Optimal)
    }
} finally { $zip.Dispose() }
# Verify the actual ZIP entry names, sizes and uncompressed bytes against inputs.
$zip = [IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    if ($zip.Entries.Count -ne $files.Count) { throw 'ZIP entry count mismatch.' }
    foreach ($file in $files) {
        $entryName = "$archiveRoot/$($file.Path)"
        $entry = $zip.GetEntry($entryName)
        if (!$entry -or $entry.Length -ne $file.Bytes -or $entry.FullName -match $forbidden) { throw "ZIP verification failed: $entryName" }
        $stream = $entry.Open()
        $hasher = [Security.Cryptography.SHA256]::Create()
        try { $hash = ([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
        finally { $stream.Dispose(); $hasher.Dispose() }
        if ($hash -ne $file.SHA256) { throw "ZIP hash mismatch: $entryName" }
    }
} finally { $zip.Dispose() }
$archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $outputRoot 'SHA256SUMS.txt'),"$archiveHash  $archiveName`r`n",[Text.UTF8Encoding]::new($false))
$result = [ordered]@{
    ok=$true
    asset=$archiveName
    bytes=(Get-Item -LiteralPath $archivePath).Length
    sha256=$archiveHash
    entries=$files.Count
    source='app-build/win-unpacked'
    profileIncluded=$false
    contentVerification='Every ZIP entry name, length and SHA-256 matches the explicit public file plan.'
    applicationArchive=$identity
}
[IO.File]::WriteAllText((Join-Path $outputRoot 'release-verification.json'),($result | ConvertTo-Json -Depth 6)+"`n",[Text.UTF8Encoding]::new($false))
$result | ConvertTo-Json -Depth 6
