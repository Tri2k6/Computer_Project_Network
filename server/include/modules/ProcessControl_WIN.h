#pragma once

#ifdef _WIN32

#define UNICODE
#define _UNICODE

#include "FeatureLibrary.h"
#include <tlhelp32.h>
#include <codecvt>

struct WinProcess {
    DWORD pid;
    std::wstring exeName;
};

class WinProcessController {
private:
    std::vector<WinProcess> procList;
public:
    std::string listProcesses();
    WinProcess getProcess(int i);
    bool startProcess(const WinProcess&);
    bool stopProcess(const WinProcess&);
};

#endif