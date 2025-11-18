#pragma once

#include <unordered_map>
#include <functional>
#include <string>
#include <iostream>

#include "Message.hpp"
#include "Protocol.hpp"
#include "Session.hpp"

class Router {
public:
    using SessionPtr = std::shared_ptr<Session>;
    using Handler = std::function<void(const Message&, SessionPtr)>;

    void registerHandler(const std::string& cmd, Handler handler) {
        handlers_[cmd] = handler;
    }

    void dispatch(const Message& msg, SessionPtr session) {
        auto it = handlers_.find(msg.cmd);
        if (it == handlers_.end()) {
            std::cerr << "[Router] No handler for cmd: " << msg.cmd << "\n";

            Message err(
                Protocol::CMD::ERROR,
                "no handler for cmd: " + msg.cmd
            );

            session->send(err.serialize());
            return;
        }

        it->second(msg, session);
    }
private:
    std::unordered_map<std::string, Handler> handlers_;
};