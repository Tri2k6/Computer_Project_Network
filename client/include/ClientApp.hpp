#pragma once

#include "ConnectionManager.hpp"
#include "Message.hpp"
#include "Protocol.hpp"
#include "WSConnection.hpp"
#include "Discovery.hpp"

#include <boost/asio.hpp>
#include <iostream>
#include <memory>

class ClientApp {
public:
    ClientApp(boost::asio::io_context& io, DiscoveryService& discovery);
    ~ClientApp() = default;

    //Upstream
    void connectToWebServer(const std::string& host, const std::string& port);
    //Downstream
    void connectToAgent(const std::string& host, const std::string& port);

    void sendServerListToWeb();
    
    void sendMessageToAll(const Message& msg);
    void sendMessageTo(size_t index, const Message& msg);

    void run();
private:
    ConnectionManager agentManager_;
    boost::asio::io_context& io_;
    DiscoveryService& discovery_;
    std::shared_ptr<WSConnection> webConn_;
private:
    void onWebMessage(const std::string& rawMsg);
    void onAgentMessage(int index, const std::string& host, const std::string& rawMsg);

    void forwardToAgent(int targetIndex, const Message& msg);
    void broadcastToAgents(const Message& msg);
};
