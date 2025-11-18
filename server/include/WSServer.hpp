#pragma once

#include <memory>
#include <iostream>
#include <unordered_set>
#include <boost/asio.hpp>
#include <boost/beast.hpp>

#include "Session.hpp"
#include "Message.hpp"
#include "Protocol.hpp"
#include "Router.hpp"

namespace beast = boost::beast;
namespace asio = boost::asio;
namespace websocket = beast::websocket;
using tcp = boost::asio::ip::tcp;

class WSServer : public std::enable_shared_from_this<WSServer> {
public:
    using SessionPtr = std::shared_ptr<Session>;

    WSServer(asio::io_context& io, uint16_t port, Router& router_);

    void start();
    void broadcast(const Message& msg);
private:
    void doAccept();
    void onNewSession(SessionPtr session);
    void onClientMessage(const std::string& raw, SessionPtr session);
private:
    tcp::acceptor acceptor_;
    tcp::socket socket_;
    std::unordered_set<SessionPtr> sessions_;
    Router router_;
};