@echo off
echo Starting Chrome with Remote Debugging...
echo This will enable Chrome DevTools MCP Server connectivity
echo.

REM Create temp directory if not exists
if not exist "C:\temp\chrome-debug" mkdir "C:\temp\chrome-debug"

REM Start Chrome with remote debugging
echo Launching Chrome on port 9222...
start "" "chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug" --new-window http://localhost:3001

echo.
echo Chrome started with remote debugging on port 9222
echo You can now:
echo 1. Restart Claude Desktop
echo 2. Use Chrome DevTools MCP tools
echo.
echo Press any key to open http://localhost:9222 to verify connection...
pause > nul
start http://localhost:9222

echo Chrome DevTools MCP Server is ready!