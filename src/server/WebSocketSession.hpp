#pragma once 

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/dispatch.hpp>
#include <boost/asio/strand.hpp>
#include <algorithm>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <memory>
#include <string>
#include <thread>
#include <vector>


namespace beast = boost::beast;         // from <boost/beast.hpp>
namespace http = beast::http;           // from <boost/beast/http.hpp>
namespace websocket = beast::websocket; // from <boost/beast/websocket.hpp>
namespace net = boost::asio;            // from <boost/asio.hpp>
using tcp = boost::asio::ip::tcp;       // from <boost/asio/ip/tcp.hpp>

class WebSocketSession : public std::enable_shared_from_this<WebSocketSession> {
    websocket::stream<beast::tcp_stream> ws_;
    beast::flat_buffer buffer_;

public:
    std::string process_request(std::string_view request) {
        if (request == "Screenshot") {
            //Call Screenshot function
            return "Screenshot requested!";
        }

        if (request == "Keylogger") {
            //Call Key logger function
            return "Keylogger requested!";
        }

        if (request == "RecordScreen") {
            //Cal Record
            return "Record screen requested!";
        }

        if (request == "Shutdown") {
            //Cal Shutdown
            return "Shutdown requested!";
        }

        if (request == "Restart") {
            //Cal Record
            return "Restart requested!";
        }

        return "Unkown request: " + std::string(request);
    }
    explicit WebSocketSession(tcp::socket&& socket)
        : ws_(std::move(socket)) {}

    void run() {
        net::dispatch(ws_.get_executor(),
            beast::bind_front_handler(&WebSocketSession::on_run, shared_from_this()));
    }

private:
    void on_run() {
        ws_.set_option(websocket::stream_base::timeout::suggested(beast::role_type::server));

        ws_.set_option(websocket::stream_base::decorator(
            [](websocket::response_type& res) {
                res.set(http::field::server, std::string(BOOST_BEAST_VERSION_STRING) + " websocket-server");
            }));

        ws_.async_accept(
            beast::bind_front_handler(&WebSocketSession::on_accept, shared_from_this()));
    }

    void on_accept(beast::error_code ec) {
        if (ec) return fail(ec, "accept");
        std::cout << "Connected!" << std::endl;
        do_read();
    }

    void do_read() {
        ws_.async_read(
            buffer_,
            beast::bind_front_handler(&WebSocketSession::on_read, shared_from_this()));
    }

    void on_read(beast::error_code ec, std::size_t bytes_transferred) {
        boost::ignore_unused(bytes_transferred);

        if (ec == websocket::error::closed) return;
        if (ec) return fail(ec, "read");

        std::string msg = beast::buffers_to_string(buffer_.data());
        std::cout << "Receive from client: " << msg << std::endl;

        std::string reply_msg = process_request(msg);
        std::cout << "Send to client: " << reply_msg << std::endl;
        buffer_.consume(buffer_.size());

        net::buffer_copy(buffer_.prepare(reply_msg.size()), net::buffer(reply_msg));
        buffer_.commit(reply_msg.size());

        ws_.text(true);
        ws_.async_write(
            buffer_.data(),
            beast::bind_front_handler(&WebSocketSession::on_write, shared_from_this()));
    }

    void on_write(beast::error_code ec, std::size_t bytes_transferred) {
        boost::ignore_unused(bytes_transferred);
        if (ec) return fail(ec, "write");

        buffer_.consume(buffer_.size());

        do_read();
    }

    void fail(beast::error_code ec, char const* what) {
        if (ec != net::error::operation_aborted && ec != websocket::error::closed)
             std::cerr << "❌ Server Session." << what << ": " << ec.message() << "\n";
    }
};