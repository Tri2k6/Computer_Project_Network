#pragma once

#ifdef _WIN32

#include <windows.h>
#include <shlobj.h>
#include <shobjidl.h>
#include <tlhelp32.h>
#include <string>
#include <vector>
#include <iostream>
#include <filesystem>

#define UNICODE
#define _UNICODE

struct WinApp {
    std::wstring exeName;
    std::wstring shortcutPath;
    std::wstring targetExe;
};

class WinAppController {
private:
    std::vector<WinApp> appList;
public:
    void listApps();
    WinApp getApp(int i);
    bool startApp(const WinApp&);
    bool stopApp(const WinApp&);
private:
    std::wstring resolveShortcut(const std::wstring&);
};

#endif