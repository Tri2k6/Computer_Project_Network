#include "ProcControl.h"


void ProcessController::listProcesses() {
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
            procList.push_back(Process {entry.th32ProcessID, entry.szExeFile});

            std::wcout << i++ << L". PID: " << entry.th32ProcessID
                       << L" | Name: " << entry.szExeFile << std::endl;
        } while (Process32NextW(snapshot, &entry));
    }

    CloseHandle(snapshot);
}


Process ProcessController::getProcess(int i)
{
    if (i < 0 || i >= procList.size())
        return {};
    
    return procList[i];
}


bool ProcessController::startProcess(const Process& proc) {
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


bool ProcessController::stopProcess(const Process& proc) {
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
