#pragma once
#include <windows.h>
#include <shlobj.h>
#include <shobjidl.h>
#include <tlhelp32.h>
#include <string>
#include <vector>
#include <iostream>
#include "ProcControl.h"

#define UNICODE
#define _UNICODE

struct AppShortcut {
    std::wstring exeName;
    std::wstring shortcutPath;
    std::wstring targetExe;
};

class AppplicationController {
private:
    std::vector<AppShortcut> appList;
public:
    void listApps();
    AppShortcut getApp(int i);
    bool startApp(const AppShortcut&);
    bool stopApp(const AppShortcut&);
private:
    std::wstring resolveShortcut(const std::wstring&);
};
