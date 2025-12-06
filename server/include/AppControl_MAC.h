#pragma once

#ifdef __APPLE__

#include "feature_library.h"

struct MacApp {
    std::string name;
    std::string path;
};

class MacAppController {
private:
    std::vector<MacApp> appList;
public:
    std::wstring listApps();
    MacApp getApp(int index);
    bool startApp(const MacApp& app);
    bool stopApp(const MacApp& app);
};

#endif