@echo off
echo Cleaning npm cache and reinstalling dependencies...

REM Delete node_modules and package-lock.json
rmdir /s /q node_modules

REM Clean npm cache
npm cache clean --force

REM Reinstall dependencies
npm install

echo Dependencies reinstalled. Starting the application...
npm start