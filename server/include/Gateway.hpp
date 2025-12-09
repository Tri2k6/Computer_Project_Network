#pragma once

#include "Router.hpp"
#include "Message.hpp"
#include "Session.hpp"
#include "WSServer.hpp"

#include <memory>
#include <nlohmann/json.hpp>

class WSServer;

class Gateway {
public:
    using SessionPtr = std::shared_ptr<Session>;
    Gateway(WSServer& server, std::shared_ptr<Router> router);
    void onMessage(SessionPtr session, const Message& msg);
    bool validateLogin(const json& inputHash);
private:
    void registerInternalRoutes();
    WSServer& server_;
    std::shared_ptr<Router> router_; //pre-routing
};