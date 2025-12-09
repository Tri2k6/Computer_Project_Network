#pragma once

#include "feature_library.h"

namespace beast = boost::beast;
namespace asio = boost::asio;
namespace websocket = beast::websocket;
using tcp = boost::asio::ip::tcp;

class WSServer : public std::enable_shared_from_this<WSServer> {
public:
    using SessionPtr = std::shared_ptr<Session>;
    using MessageHandler = std::function<void(SessionPtr, const Message&)>;

    WSServer(asio::io_context& io, uint16_t port, std::shared_ptr<Router> router_);

    void start();
    void broadcast(const Message& msg);

    void setMessageHandler(MessageHandler handler);
private:
    void doAccept();
    void onNewSession(SessionPtr session);
    void onClientMessage(const std::string& raw, SessionPtr session);
private:
    tcp::acceptor acceptor_;
    tcp::socket socket_;
    std::unordered_set<SessionPtr> sessions_;
    std::shared_ptr<Router> router_;
    MessageHandler customHandler_;
};