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

    // setup link between command and function
    void registerHandler(const std::string& type, Handler handler) {
        if (handlers_.find(type) != handlers_.end()) {
            std::cout << "[Router] Warning: Overwriting handler for type: " << type << "\n";
        }
        handlers_[type] = handler;
    }

    // call function of corresponding command
    void dispatch(const Message& msg, SessionPtr session) {
        auto it = handlers_.find(msg.type);
        
        if (it == handlers_.end()) {
            std::cerr << "[Router] No handler for cmd: " << msg.type << "\n";

            Message err(
                "error",
                json{{"msg", "Unkown command type: " + msg.type}}
            );

            session->send(err.serialize());
            return;
        }
        try {
            //call handler
            it->second(msg, session);
        }
        catch (const std::exception& e) {
            std::cerr << "[Router] CRITICAL ERROR executing " << msg.type << ": " << e.what() << "\n";
            Message err(
                "error",
                json{{"msg", "Internal Server Error executing command"}}
            );
            session->send(err.serialize());
        }
        catch(...) {
            std::cerr << "[Router] Unkown error executing " << msg.type << "\n";
        }
    }

private:
    std::unordered_map<std::string, Handler> handlers_;
};