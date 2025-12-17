#pragma once
#include "FeatureLibrary.h"

class GatewayDiscovery {
public:
    static std::pair<std::string, std::string> discoverGateway(int timeoutMs = 3000);
    
private:
    static std::string getLocalIP();
    static bool sendBroadcastRequest();
    static std::pair<std::string, std::string> listenForResponse(int timeoutMs);
};
