#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/beast/websocket/stream.hpp>
#include <boost/asio.hpp>
#include <boost/asio/strand.hpp>

#include <queue>
#include <functional>
#include <string>
#include <memory>

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace asio = boost::asio;
using tcp = asio::ip::tcp;

class WSConnection : public std::enable_shared_from_this<WSConnection> {
public:
    explicit WSConnection (asio::io_context& ioc,
                           const std::string& url,
                           const std::string& port = "80",
                           const std::string& target = "/")
            : resolver_(asio::make_strand(ioc)), 
              ws_(asio::make_strand(ioc)),
              host_(url),
              port_(port),
              target_(target)
    {}

    std::function<void()> onConnected;
    std::function<void(std::string)> onMessage;
    std::function<void()> onClosed;
    std::function<void(beast::error_code)> onError;

    void connect();
    void send(const std::string& msg);
    void close();
    
    bool isOpen() const {
        return isOpen_;
    }

    bool isDead() const {
        return isDead_;
    }
private:
        tcp::resolver resolver_;
        websocket::stream<beast::tcp_stream> ws_;
        beast::flat_buffer buffer_;

        std::string host_;
        std::string port_;
        std::string target_;

        std::queue <std::string> writeQueue_;
        bool writing_ = false;
        bool isOpen_ = false;
        bool isDead_ = false;
private:
      void doResolve();
      void onResolve(beast::error_code, tcp::resolver::results_type);
      
      void onConnect(beast::error_code, tcp::resolver::results_type::endpoint_type);
      void onHandshake(beast::error_code);

      void doRead();
      void onRead(beast::error_code, std::size_t);
      
      void doWrite();
      void onWrite(beast::error_code, std::size_t);

};