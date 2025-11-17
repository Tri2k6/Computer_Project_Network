#pragma once

#define UNICODE
#define _UNICODE

#include <windows.h>
#include <tlhelp32.h>
#include <iostream>
#include <string>
#include <vector>

struct Process {
    DWORD pid;
    std::wstring exeName;
};

class ProcessController {
private:
    std::vector<Process> procList;
public:
    void listProcesses();
    Process getProcess(int i);
    bool startProcess(const Process&);
    bool stopProcess(const Process&);
};