#pragma once

#include <string>
#include <nlohmann/json.hpp>

#include "Router.hpp"
#include "Message.hpp"
#include "Protocol.hpp"
#include "Session.hpp"
#include "WSServer.hpp"

class Gateway {
public:
    using SessionPtr = std::shared_ptr<Session>;
    Gateway(WSServer& server, Router& router);
    void onMessage(SessionPtr session, const Message& msg);
    bool validateLogin(const json& inputHash);
private:
    WSServer& server_;
    Router router_; //pre-routing
};