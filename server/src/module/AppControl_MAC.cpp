#ifdef __APPLE__

#include "AppControl_MAC.h"


std::vector<MacApp> MacAppController::listApps() {
    apps.clear();
    std::vector<std::string> dirs = {
        "/Applications",
        "/System/Applications",
        std::string(getenv("HOME")) + "/Applications"
    };

    int i = 0;
    for (auto& d : dirs) {
        for (auto& p : std::filesystem::directory_iterator(d)) {
            if (p.path().extension() == ".app") {
                MacApp app;
                app.name = p.path().stem().string();
                app.path = p.path().string();
                apps.push_back(app);

                std::cout << i++ << ". " << app.name << "\n";
            }
        }
    }
    return apps;
}


MacApp MacAppController::getApp(int index) {
    if (index < 0 || index >= apps.size()) return {};
    return apps[index];
}


bool MacAppController::startApp(const MacApp& app) {
    std::string cmd = "open \"" + app.path + "\"";
    return (system(cmd.c_str()) == 0);
}


bool MacAppController::stopApp(const MacApp& app) {
    std::string cmd = "pkill -f \"" + app.name + "\"";
    return (system(cmd.c_str()) == 0);
}

#endif