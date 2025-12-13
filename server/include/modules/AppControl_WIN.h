#pragma once

#ifdef _WIN32

#include "FeatureLibrary.h"

#include <shlobj.h>
#include <shobjidl.h>
#include <tlhelp32.h>
#include <codecvt>

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
    std::string listApps();
    WinApp getApp(int i);
    bool startApp(const WinApp&);
    bool stopApp(const WinApp&);
private:
    std::wstring resolveShortcut(const std::wstring&);
};

#endif