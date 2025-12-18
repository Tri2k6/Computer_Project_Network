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
    
    // JSON serialization support
    json toJson() const {
        return json{
            {"PID", static_cast<int>(pid)},
            {"ProcessName", ws_to_utf8(exeName)},
            {"Status", "Running"}
        };
    }
};

class WinProcessController {
private:
    std::vector<WinProcess> procList;
public:
    std::vector<WinProcess> listProcesses();
    json listProcessesJson(); // Returns JSON array for website
    WinProcess getProcess(int i);
    bool startProcess(const WinProcess&);
    bool stopProcess(const WinProcess&);
};

#endif