#pragma once

#ifdef _WIN32

#define UNICODE
#define _UNICODE

#include <windows.h>
#include <tlhelp32.h>
#include <iostream>
#include <string>
#include <vector>

struct WinProcess {
    DWORD pid;
    std::wstring exeName;
};

class WinProcessController {
private:
    std::vector<WinProcess> procList;
public:
    void listProcesses();
    WinProcess getProcess(int i);
    bool startProcess(const WinProcess&);
    bool stopProcess(const WinProcess&);
};

#endif