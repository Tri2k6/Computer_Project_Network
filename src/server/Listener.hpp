#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/dispatch.hpp>
#include <boost/asio/strand.hpp>
#include <boost/asio/ip/tcp.hpp>

#include <algorithm>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <memory>
#include <string>
#include <thread>
#include <vector>

#include "WebSocketSession.hpp"

namespace beast = boost::beast;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

class Listener : public std::enable_shared_from_this<Listener> {
    net::io_context& ioc_;
    tcp::acceptor acceptor_;

public:
    Listener(net::io_context& ioc, tcp::endpoint endpoint)
        : ioc_(ioc), acceptor_(net::make_strand(ioc)) {
        beast::error_code ec;

        acceptor_.open(endpoint.protocol(), ec);
        if (ec) { fail(ec, "open"); return; }

        acceptor_.set_option(net::socket_base::reuse_address(true), ec);
        if (ec) { fail(ec, "set_option"); return; }

        acceptor_.bind(endpoint, ec);
        if (ec) { fail(ec, "bind"); return; }

        acceptor_.listen(net::socket_base::max_listen_connections, ec);
        if (ec) { fail(ec, "listen"); return; }
    }

    void run() {
        do_accept();
    }

private:
    void do_accept() {
        acceptor_.async_accept(
            net::make_strand(ioc_),
            beast::bind_front_handler(&Listener::on_accept, shared_from_this()));
    }

    void on_accept(beast::error_code ec, tcp::socket socket) {
        if (ec) {
            fail(ec, "accept");
        } else {
            std::make_shared<WebSocketSession>(std::move(socket))->run();
        }

        do_accept();
    }

    void fail(beast::error_code ec, char const* what) {
        std::cerr << "Listener Failed!" << what << ": " << ec.message() << "\n";
    }
};