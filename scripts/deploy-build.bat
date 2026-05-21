@echo off
REM Wrapper .bat para deploy-build.ps1
REM Permite duplo-clique no Explorer ou rodar via cmd
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-build.ps1" %*
pause
