#pragma once
#ifdef __APPLE__

#include <filesystem>
#include <iostream>
#include <vector>
#include <cstdlib>

struct MacApp {
    std::string name;
    std::string path;
};

class MacAppController {
private:
    std::vector<MacApp> apps;
public:
    void listApps();
    MacApp getApp(int index);
    bool startApp(const MacApp& app);
    bool stopApp(const MacApp& app);
};

#endif