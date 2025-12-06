#include "Gateway.hpp"

Gateway::Gateway(WSServer& server, Router& router) : server_(server), router_(router) {}

bool Gateway::validateLogin(const json& data) {
    if (!data.contains("user") || !data.contains("pass")) {
        std::cerr << "[Gateway] Login failed: Missing user or pass field";
        return false;
    }
    std::string user = data["user"];
    std::string pass = data["pass"];

    const std::string VALID_USER = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
    const std::string VALID_PASS = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
    return user == VALID_USER && pass == VALID_PASS;
}

void Gateway::onMessage(SessionPtr session, const Message& msg) {
    //std::cout << "[Gateway] Received from " << clientId << ": " << payload << "\n";
    bool isLogged = session->isLoggedIn();

    if (!isLogged) {
        if (msg.type == Protocol::TYPE::AUTH) {
            if (validateLogin(msg.data)) {
                if (msg.data.is_object() && validateLogin(msg.data)) {
                    session->setAuthenticated(true);
                    session->send(Message("auth_result", "ok").serialize());
                    std::cout << "[Gateway] User logged in!\n";
                } else {
                    session->send(Message("error", "Invalid username or password.").serialize());
                }
            } else {
                session->send(Message("error", "Wrong password").serialize());
            }
        } else {
            session->send(Message("error", "Please login first").serialize());
        }
        
        return;
    }

    router_.dispatch(msg, session);
}

void Gateway::registerInternalRoutes() {
    router_.registerHandler(
        Protocol::TYPE::PING,
        [](const Message&, Gateway::SessionPtr s) {
            s->send(
                Message(Protocol::TYPE::PONG, "Server Alive").serialize()
            );
        }
    );

    router_.registerHandler(
        Protocol::TYPE::HEARTBEAT,
        [](const Message&, Gateway::SessionPtr s) {
            s->send(
                Message(Protocol::TYPE::HEARTBEAT, "bump - bump").serialize()
            );
        }
    );
    
    router_.registerHandler(
        Protocol::TYPE::BROADCAST, 
        [this](const Message& msg, SessionPtr session) {
            this->server_.broadcast(msg);
    });

    router_.registerHandler(
        Protocol::TYPE::PROC_LIST, 
        [this](const Message& msg, SessionPtr s) {
            MacAppController ac;
            auto apps = ac.listApps();
            s->send(Message(Protocol::TYPE::PROC_LIST, apps));
    });
}
