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
    
    // JSON serialization support
    json toJson() const {
        return json{
            {"id", -1}, // Will be set by controller
            {"name", ws_to_utf8(exeName)},
            {"path", ws_to_utf8(targetExe.empty() ? shortcutPath : targetExe)}
        };
    }
};

class WinAppController {
private:
    std::vector<WinApp> appList;
public:
    std::vector<WinApp> listApps();
    json listAppsJson(); // Returns JSON array for website
    WinApp getApp(int i);
    bool startApp(const WinApp&);
    bool stopApp(const WinApp&);
private:
    std::wstring resolveShortcut(const std::wstring&);
};

#endif