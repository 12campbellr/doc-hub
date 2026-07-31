@echo off
set PATH=%~dp0.tools\node;%PATH%
cd /d %~dp0
echo Starting DOC Hub (dev mode) at http://localhost:3000
echo Press Ctrl+C to stop.
npm run dev
