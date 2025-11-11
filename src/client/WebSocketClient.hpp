#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/strand.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>

#include <functional>
#include <memory>
#include <string>
#include <vector>
#include <deque>
#include <iostream>

namespace beast = boost::beast;
namespace http = beast::http;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

class WebSocketClient : public std::enable_shared_from_this<WebSocketClient> {
    websocket::stream<beast::tcp_stream> ws_;
    beast::flat_buffer buffer_;
    tcp::resolver resolver_;
    std::string host_;
    std::string text_path_;
    std::deque<std::string> write_queue_;
    std::function<void(std::string)> on_message_received_;
    std::atomic<bool> connected_{false};
public:
    WebSocketClient(net::io_context& ioc, std::function<void(std::string)> callback)
        : ws_(net::make_strand(ioc)), resolver_(net::make_strand(ioc)), on_message_received_(callback){}
    
    bool is_connected() const{
        return connected_.load();
    }
    void run(char const* host, char const* port, char const* path) {
        host_ = host;
        text_path_ = path;
        
        resolver_.async_resolve(
            host, port, 
            beast::bind_front_handler(&WebSocketClient::on_resolve, shared_from_this())
        );
    }

    void send(std::string message) {
        net::post(ws_.get_executor(),
            beast::bind_front_handler (
                &WebSocketClient::do_write,
                shared_from_this(),
                std::move(message)
            )    
        );
    }

    void close() {
        if (is_connected()) {
            net::post(ws_.get_executor(), [self = shared_from_this()]() {
                self->ws_.async_close(websocket::close_code::normal,
                    beast::bind_front_handler(&WebSocketClient::on_close, self));
            });
        }
    }

private:
    void on_resolve(beast::error_code ec, tcp::resolver::results_type results) {
        if (ec) return fail(ec, "resolve");
        
        beast::get_lowest_layer(ws_).expires_after(std::chrono::seconds(30));

        beast::get_lowest_layer(ws_).async_connect(
            results,
            beast::bind_front_handler(&WebSocketClient::on_connect, shared_from_this())
        );
    }

    void on_connect(beast::error_code ec, tcp::resolver::results_type::endpoint_type ep) {
        if (ec) return fail(ec, "connect");

        beast::get_lowest_layer(ws_).expires_never();

        ws_.set_option(websocket::stream_base::timeout::suggested(beast::role_type::client));

        ws_.set_option(websocket::stream_base::decorator(
                [](websocket::request_type& req) {
                    req.set(http::field::user_agent, std::string(BOOST_BEAST_VERSION_STRING) + "websocket-client");
                }
            )
        );

        ws_.async_handshake(host_, text_path_, 
            beast::bind_front_handler(&WebSocketClient::on_handshake, shared_from_this())
        );
    }

    void on_close(beast::error_code ec) {
        connected_ = false;
        if (ec && ec != net::error::operation_aborted) {
            fail(ec, "close");
        }
    }

    void on_handshake(beast::error_code ec) {
        if (ec) return fail(ec, "handshake");

        std::cout << "Connect Successfully!\n";
        connected_ = true;
        do_read();
    }

    void do_read() {
        ws_.async_read(
            buffer_,
            beast::bind_front_handler(&WebSocketClient::on_read, shared_from_this())
        );
    }

    void on_read(beast::error_code ec, std::size_t bytes_transferred) {
        boost::ignore_unused(bytes_transferred);
        if (ec == websocket::error::closed || ec == net::error::connection_reset) {
            connected_ = false;
            return;
        }

        if (ec) return fail(ec, "read");

        std::string received_msg = beast::buffers_to_string(buffer_.data());

        if (on_message_received_) {
            on_message_received_(received_msg);
        }

        buffer_.consume(buffer_.size());
        do_read();
    }

    void do_write(std::string message) {
        write_queue_.push_back(message);

        if (write_queue_.size() == 1) {
            ws_.async_write(
                net::buffer(write_queue_.front()),
                beast::bind_front_handler(&WebSocketClient::on_write, shared_from_this())
            );
        }
    }

    void on_write(beast::error_code ec, std::size_t bytes_transferred) {
        boost::ignore_unused(bytes_transferred);
        if (ec) return fail(ec, "write");
        write_queue_.pop_front();

        if (!write_queue_.empty()) {
            ws_.async_write(
                net::buffer(write_queue_.front()),
                beast::bind_front_handler(&WebSocketClient::on_write, shared_from_this())
            );
        }
    }

    void fail(beast::error_code ec, char const* what) {
        connected_ = false;
        std::cerr << what << ": " << ec.message() << "\n";
    }
};