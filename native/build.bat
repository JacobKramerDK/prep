@echo off
powershell.exe -ExecutionPolicy Bypass -File "%~dp0build.ps1"
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
