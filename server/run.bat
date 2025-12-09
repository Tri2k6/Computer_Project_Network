@echo off
echo Building server...

REM Enable delayed variable expansion for variable concatenation
setlocal enabledelayedexpansion

REM Initialize SRCFILES variable to empty
set SRCFILES=

REM Recursively find all .cpp files inside src and subfolders
for /R src %%f in (*.cpp) do (
    set SRCFILES=!SRCFILES! "%%f"
)

REM Compile all source files with include paths and link Winsock libraries
g++ !SRCFILES! -I include -I C:\vcpkg\installed\x64-windows\include -o server.exe -lws2_32 -lmswsock -lole32 -lshell32 -luuid

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo =======================
    echo BUILD FAILED. SEE ERRORS
    echo =======================
    pause
    exit /b
)

echo.
echo =======================
echo BUILD SUCCESSFUL
echo =======================
echo Running server...
echo.

REM server.exe

pause
