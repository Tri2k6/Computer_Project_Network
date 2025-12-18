#pragma once
#include "FeatureLibrary.h"

class GatewayDiscovery {
public:
    static std::pair<std::string, std::string> discoverGateway(int timeoutMs = 3000);
    static bool canResolveHostname(const std::string& hostname);
    
private:
    static std::string getLocalIP();
    static bool sendBroadcastRequest();
    static std::pair<std::string, std::string> listenForResponse(int timeoutMs);
};
