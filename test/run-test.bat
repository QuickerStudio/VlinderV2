@echo off
cd /d "%~dp0"
echo Running Multi Replace String Tool Tests...
npx jest src/agent/v1/tools/runners/multi-replace-string.tool.test.ts --verbose --no-coverage
pause

