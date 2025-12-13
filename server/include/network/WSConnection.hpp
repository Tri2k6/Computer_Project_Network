#pragma once

#include "FeatureLibrary.h"

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
          try : resolver_(asio::make_strand(ioc)), 
                ws_(asio::make_strand(ioc)),
                host_(url),
                port_(port),
                target_(target)
  {
      //std::cout << "[DEBUG] WSConnection Constructor entered success!" << std::endl;
  } catch (...) {
      std::cerr << "[CRITICAL] Crash inside WSConnection Init List!" << std::endl;
  }

    std::function<void()> onConnected;
    std::function<void(std::string)> onMessage;
    std::function<void()> onClosed;
    std::function<void(beast::error_code)> onError;

    void connect();
    void send(const std::string& msg);
    void close();

private:
        tcp::resolver resolver_;
        websocket::stream<beast::tcp_stream> ws_;
        beast::flat_buffer buffer_;

        std::string host_;
        std::string port_;
        std::string target_;

        std::queue <std::string> writeQueue_;
        bool writing_ = false;
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