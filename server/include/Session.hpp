#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio.hpp>
#include <boost/asio/strand.hpp>

#include <memory>
#include <queue>
#include <string>
#include <functional>

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace asio = boost::asio;
using tcp = asio::ip::tcp;

class Session : public std::enable_shared_from_this<Session> {
public:
    using MessageHandler = std::function<void(const std::string&, std::shared_ptr<Session>)>;
    std::function <void(std::shared_ptr<Session>)> onClosed;
    explicit Session(tcp::socket socket) : ws_(std::move(socket)) {}

    void start(MessageHandler handler);
    void send(const std::string& msg);

    websocket::stream<beast::tcp_stream>& getSocket();
private:
    websocket::stream<beast::tcp_stream> ws_;
    beast::flat_buffer buffer_;
    std::queue<std::string> writeQueue_;
    MessageHandler messageHandler_;

    void doRead();
    void doWrite();
};