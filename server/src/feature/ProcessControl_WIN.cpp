#ifdef _WIN32

#include "ProcessControl_WIN.h"


void WinProcessController::listProcesses() {
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) {
        std::cerr << "Cannot take process snapshot\n";
        return;
    }

    PROCESSENTRY32W entry;
    entry.dwSize = sizeof(entry);

    if (Process32FirstW(snapshot, &entry)) {
        int i = 0;
        do {
            procList.push_back({entry.th32ProcessID, entry.szExeFile});

            std::wcout << i++ << L". PID: " << entry.th32ProcessID
                       << L" | Name: " << entry.szExeFile << std::endl;
        } while (Process32NextW(snapshot, &entry));
    }

    CloseHandle(snapshot);
}


WinProcess WinProcessController::getProcess(int i)
{
    if (i < 0 || i >= procList.size())
        return {};
    
    return procList[i];
}


bool WinProcessController::startProcess(const WinProcess& proc) {
    STARTUPINFOW si = { sizeof(si) };
    PROCESS_INFORMATION pi;

    BOOL success = CreateProcessW(
        proc.exeName.c_str(),
        NULL,
        NULL, NULL, FALSE,
        0, NULL, NULL,
        &si, &pi
    );

    if (!success) {
        std::wcerr << L"Failed to start: " << proc.exeName << std::endl;
        return false;
    }

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    return true;
}


bool WinProcessController::stopProcess(const WinProcess& proc) {
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE)
        return false;

    PROCESSENTRY32W entry;
    entry.dwSize = sizeof(entry);

    bool stopped = false;

    if (Process32FirstW(snapshot, &entry)) {
        do {
            if (_wcsicmp(entry.szExeFile, proc.exeName.c_str()) == 0 && entry.th32ProcessID == proc.pid) {
                HANDLE hProc = OpenProcess(PROCESS_TERMINATE, FALSE, entry.th32ProcessID);

                if (hProc) {
                    TerminateProcess(hProc, 0);
                    CloseHandle(hProc);
                    stopped = true;
                }
            }
        } while (Process32NextW(snapshot, &entry));
    }

    CloseHandle(snapshot);
    return stopped;
}

#endif