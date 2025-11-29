#include "Gateway.hpp"

Gateway::Gateway(WSServer& server, Router& payload) : _server(server), _appRouter(Router) {}

void Gateway::onMessage(int clientId, const std::string& msg) {
    std::cout << "[Gateway] Received from " << clientId << ": " << payload << "\n";
    bool isLogged = Session::isLoggedIn(clientId);

    if (!isLogged) {
        if (isAuthRequest(payload)) {
            handleLogin(clientId, payload);
        } else {
            sendError(clientId, "401 Unauthorized: Please login first.");
        }
        return;
    }
    _appRouter.route(clientId, message);
}

bool Gateway::isAuthRequest(const std::string& payload) {
    return payload.find("\"type\":\"login\"") != std::string::npos;
}

void Gateway::handleLogin(int clientId, const std::string& payload) {
    bool loginSuccess = true;

    if (loginSuccess) {
        Session::createSession(clientId);
        _server.send(clientId, "{\"status\"ok\", \"msg\":\"Login success\"}");
        std::cout << "[Gateway] Client" << ClientId << " authenticated.\n";
    } else {
        sendError(clientId, "Login failed: wrong password.");
    }
}

void Gateway::sendError(int clientId, const std::string& errorMsg) {
    str::string response = "{\"status\":\"error\", \"msg\":\"" + errorMsg + "\"}";
    _server.send(clientId, response);
}