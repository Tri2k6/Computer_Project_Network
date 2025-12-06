#pragma once
#ifdef __APPLE__

#include <filesystem>
#include <iostream>
#include <vector>
#include <cstdlib>
#include <nlohmann/json.hpp>

struct MacApp {
    std::string name;
    std::string path;
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(MacApp, name, path)
};

class MacAppController {
private:
    std::vector<MacApp> apps;
public:
    std::vector<MacApp> listApps();
    MacApp getApp(int index);
    bool startApp(const MacApp& app);
    bool stopApp(const MacApp& app);
};

#endif