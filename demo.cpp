#if defined(_WIN32)
    #include "AppControl_WIN.h"
    #include "ProcessControl_WIN.h"
#elif defined(__APPLE__)
    #include "AppControl_MAC.h"
    #include "ProcessControl_MAC.h"
#endif

#include <iostream>
#include <fcntl.h>
#include <io.h>

int main() {

    int i = 0;

    #if defined(_WIN32)
    // Windows version
    // chương trình không hiểu tên ứng dụng tiếng việt và ngắt stream nên phải đổi chế độ in/out
    _setmode(_fileno(stdout), _O_U16TEXT);
    _setmode(_fileno(stdin),  _O_U16TEXT);

    WinProcessController pc;
    WinAppController ac;

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

    #elif defined(__APPLE__)
    // macOS version
    MacProcessController pc;
    MacAppController ac;

    pc.listProcesses();

    std::cout << "\nSelect a process: ";
    std::cin >> i;

    if (pc.stopProcess(pc.getProcess(i)))
        std::cout << "Killed!\n";
    else
        std::cout << "Not found!\n";

    // Sleep không có sẵn trong macOS, dùng usleep thay thế (micro giây)
    usleep(3000 * 1000);  // 3000 ms = 3s

    ac.listApps();

    std::cout << "\nSelect an app: ";
    std::cin >> i;

    if (ac.startApp(ac.getApp(i)))
        std::cout << "Activated!\n";
    else
        std::cout << "Not found!\n";

    std::cout << "\nClose an app: ";
    std::cin >> i;

    if (ac.stopApp(ac.getApp(i)))
        std::cout << "Shut down!\n";
    else
        std::cout << "Not found!\n";

    #endif

    return 0;
}