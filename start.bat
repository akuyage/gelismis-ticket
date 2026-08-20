@echo off
chcp 65001 >nul
title Gelişmiş Ticket Bot
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [HATA] Node.js bulunamadi. Lutfen https://nodejs.org adresinden Node.js kurun.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [BILGI] Bagimliliklar kuruluyor...
    call npm install
    if errorlevel 1 (
        echo [HATA] Kurulum basarisiz oldu.
        pause
        exit /b 1
    )
)

echo [BILGI] Bot baslatiliyor...
node src/index.js
pause