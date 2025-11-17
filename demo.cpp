#include "ProcControl.h"
#include "AppControl.h"
#include <iostream>
#include <fcntl.h>
#include <io.h>

int main() {
    // chương trình không hiểu tên ứng dụng và ngắt stream nên phải thêm
    _setmode(_fileno(stdout), _O_U16TEXT);
    _setmode(_fileno(stdin),  _O_U16TEXT);

    ProcessController pc;
    AppplicationController ac;
    int i = 0;

    pc.listProcesses();

    std::wcout << L"\nSelect a process: ";
    std::wcin >> i;

    if (pc.stopProcess(pc.getProcess(i)))
        std::wcout << L"Killed!\n";
    else
        std::wcout << L"Not found!\n";

    Sleep(3000);

    ac.listApps();

    std::wcout << L"\nSelect an app: ";
    std::wcin >> i;

    if (ac.startApp(ac.getApp(i)))
        std::wcout << L"Activated!\n";
    else
        std::wcout << L"Not found!\n";

    std::wcout << L"\nClose an app: ";
    std::wcin >> i;

    if (ac.stopApp(ac.getApp(i)))
        std::wcout << L"Shut down!\n";
    else
        std::wcout << L"Not found!\n";

    return 0;
}