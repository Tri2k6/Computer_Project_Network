#ifdef _WIN32

#include "ProcessControl_WIN.h"
#include "Converter.h"


std::vector<WinProcess> WinProcessController::listProcesses() {
    procList.clear();

    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) {
        std::cerr << "Cannot take process snapshot\n";
        return procList;
    }

    PROCESSENTRY32W entry{};
    entry.dwSize = sizeof(entry);

    if (Process32FirstW(snapshot, &entry)) {
        do {
            WinProcess p;
            p.pid = entry.th32ProcessID;
            p.exeName = entry.szExeFile;
            procList.push_back(p);
        } while (Process32NextW(snapshot, &entry));
    }

    CloseHandle(snapshot);
    return procList;
}

json WinProcessController::listProcessesJson() {
    auto processes = listProcesses();
    json result = json::array();
    for (const auto& proc : processes) {
        result.push_back(proc.toJson());
    }
    return result;
}


WinProcess WinProcessController::getProcess(int i) {
    if (procList.size() == 0)
        listProcesses();
    
    if (i < 0 || i >= procList.size())
        return {};
    
    return procList[i];
}


bool WinProcessController::startProcess(const WinProcess& proc) {
    listProcesses();
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
        return false;
    }

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    return true;
}


bool WinProcessController::stopProcess(const WinProcess& proc) {
    HANDLE hProc = OpenProcess(PROCESS_TERMINATE, FALSE, proc.pid);

    if (!hProc) {
        return false;
    }

    if (!TerminateProcess(hProc, 0)) {
        CloseHandle(hProc);
        return false;
    }

    CloseHandle(hProc);
    return true;
}

#endif