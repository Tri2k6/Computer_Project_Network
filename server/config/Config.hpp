#pragma once
#include <string>
#include <fstream>
#include <iostream>
#include <cstdlib>

namespace Config {
    const std::string SERVER_HOST = "localhost"; // Gatewayserver IP
    const std::string SERVER_PORT = "8080";
    const int RECONNECT_DELAY_MS = 3000;
    inline bool loadToken() {
        std::ifstream file("config.txt");
        if (!file.is_open()) {
            std::cerr << "[Config] LOI: Khong tim thay file config.txt chua Token!\n";
            return false;
        }

        std::getline(file, AGENT_TOKEN);
        file.close();
        if (!AGENT_TOKEN.empty() && AGENT_TOKEN.back() == '\r') {
            AGENT_TOKEN.pop_back();
        }
        if (!AGENT_TOKEN.empty() && AGENT_TOKEN.back() == '\n') {
            AGENT_TOKEN.pop_back();
        }

        if (AGENT_TOKEN.empty()) {
            std::cerr << "[Config] LOI: Token trong file config.txt bi rong!\n";
            return false;
        }

        return true;
    }
}