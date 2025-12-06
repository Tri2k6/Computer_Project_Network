#pragma once

#include "feature_library.h"

class Gateway {
public:
    using SessionPtr = std::shared_ptr<Session>;
    Gateway(WSServer& server, Router& router);
    void onMessage(SessionPtr session, const Message& msg);
    bool validateLogin(const json& inputHash);
private:
    void registerInternalRoutes();
    WSServer& server_;
    Router router_; //pre-routing
};