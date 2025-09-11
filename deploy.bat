@echo off
echo.
echo ========================================
echo   Astral Core v7 - Easy Deployment
echo ========================================
echo.
echo Starting deployment process...
echo.

REM Run the deployment script
node scripts/vercel-deploy.js

echo.
echo ========================================
echo   Deployment Process Complete!
echo ========================================
echo.
pause