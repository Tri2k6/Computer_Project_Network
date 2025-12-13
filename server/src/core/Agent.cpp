#include "Agent.hpp"
#include "../../config/Config.hpp"
#include "Protocol.hpp"
#include "FeatureLibrary.h"
#include <iostream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;
using std::cout;

Agent::Agent(boost::asio::io_context& ioc) : ioc_(ioc), dispatcher_(std::make_shared<CommandDispatcher>()) {
    agentID_ = getHostName();
}

void Agent::run() {
    cout << "[Agent] Starting service on: " << agentID_ << "\n";
    connect();    
}

void Agent::connect() {
    // cout << "[Debug] Init WSConnection...\n" << std::flush;
    try {
        client_ = std::make_shared<WSConnection>(ioc_, Config::SERVER_HOST, Config::SERVER_PORT);

        client_->onConnected = [this]() {
            this->onConnected();
        };

        client_->onMessage = [this](std::string msg) {
            this->onMessage(msg);
        };

        client_->onClosed = [this]() {
            this->onDisconnected();
        };

        client_->onError = [this](boost::beast::error_code ec) {
            std::cerr << "[Network] Error: " << ec.message() << "\n";
            this->onDisconnected();
        };
        // std::cout << "[Debug] Triggering client_->connect()...\n" << std::flush;
        client_->connect();

    } catch (const std::exception& e) {
        // std::cerr << "[CRITICAL] Exception in connect(): " << e.what() << "\n" << std::flush;
        onDisconnected();
    } catch (...) {
        // std::cerr << "[FATAL] Unknown Low-level Crash in Agent::connect()!\n" << std::flush;
        onDisconnected();
    }
}

void Agent::onConnected() {
    cout << "[Network] Connected to Gateway. Sending Auth...\n";
    sendAuth();
}

void Agent::sendAuth() {
    json authPayload = {
        {"role", "AGENT"},
        {"user", agentID_},
        {"pass", Config::AGENT_TOKEN},
        {"machineId", agentID_}
    };

    Message msg(Protocol::TYPE::AUTH, authPayload, agentID_);
    client_->send(msg.serialize());
}

void Agent::onMessage(const std::string& payload) {
    try {
        Message request = Message::deserialize(payload);

        dispatcher_->dispatch(request, [this](Message response) {
            response.from = agentID_;
            client_->send(response.serialize());
        });
    } catch (std::exception& e) {
        std::cerr << "[Agent] Error processing message: " << e.what() << "\n";
    }
}

void Agent::onDisconnected() {
    cout << "[Network] Disconnected. Retrying in " << Config::RECONNECT_DELAY_MS << "ms...\n";
    if(client_) {
        client_->onClosed = nullptr;
        client_->onError = nullptr;
    }
    client_.reset();

    std::cout << "[Network] Disconnected. Retrying in " << Config::RECONNECT_DELAY_MS << "ms...\n" << std::flush;
    retryTimer_ = std::make_unique<boost::asio::steady_timer>(ioc_, std::chrono::milliseconds(Config::RECONNECT_DELAY_MS));
    retryTimer_->async_wait([this](const boost::system::error_code& ec) {
        if (!ec) {
            std::cout << "[Debug] Retry timer expired. Reconnecting...\n" << std::flush;
            connect();
        }
    });
}