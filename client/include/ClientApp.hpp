#pragma once

#include "ConnectionManager.hpp"
#include "Message.hpp"
#include "Protocol.hpp"
#include "WSConnection.hpp"

#include <boost/asio.hpp>
#include <iostream>
#include <memory>

class ClientApp {
public:
    ClientApp(boost::asio::io_context& io);
    ~ClientApp() = default;
    
    void addServer(const std::string& host, const std::string& port);

    void sendMessageToAll(const Message& msg);
    void sendMessageTo(size_t index, const Message& msg);

    void run();
private:
    ConnectionManager manager_;
    boost::asio::io_context& io_;
};
