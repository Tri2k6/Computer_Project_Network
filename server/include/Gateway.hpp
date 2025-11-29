#pragma once

#include <string>
#include "Router.hpp"
#include "Session.hpp"
#include "WSServer.hpp"

class Gateway {
public:
    Gateway(WSServer& server, Router& router);
    void onMessage(int clientId, const std::string& msg);
private:
    WSServer& _server;
    Router _appRouter; //pre-routing

    bool isAuthRequest(int clientId, const std::string& payload);
    void handleLogin(int clientId, const std::string& payload);
    void sendError(int clientId, const std::string& errorMsg);
};