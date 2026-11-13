@echo off
chcp 65001 >nul
setlocal
set "OGC_RU_DIR=%~dp0app"
if not exist "%OGC_RU_DIR%\Open-Git-Control.exe" (
  echo Не найден app\Open-Git-Control.exe. Проверьте комплектность папки программы.
  pause
  exit /b 1
)
start "" /D "%OGC_RU_DIR%" "%OGC_RU_DIR%\Open-Git-Control.exe"
endlocal
