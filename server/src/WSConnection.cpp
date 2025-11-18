#include "WSConnection.hpp"

#include <iostream>

void WSConnection::connect() {
    auto self = shared_from_this();
    resolver_.async_resolve(
        host_,
        port_,
        [this, self](beast::error_code ec, tcp::resolver::results_type results) {
            onResolve(ec, results);
        }
    );
}

void WSConnection::onResolve(beast::error_code ec,
                             tcp::resolver::results_type results) {
    if (ec) {
        if (onError) onError(ec);
        return;
    }

    auto self = shared_from_this();

    beast::get_lowest_layer(ws_).async_connect(
        results,
        [this, self](beast::error_code ec,
                     tcp::resolver::results_type::endpoint_type ep) {
            onConnect(ec, ep);
        }
    );
}

void WSConnection::onConnect(beast::error_code ec,
                             tcp::resolver::results_type::endpoint_type ep) {
    if (ec) {
        if (onError) onError(ec);
        return;
    }

    auto self = shared_from_this();
    ws_.async_handshake(
        host_,
        target_,
        [this, self](beast::error_code ec) {
            onHandshake(ec);
        }
    );
}

void WSConnection::onHandshake(beast::error_code ec) {
    if (ec) {
        if (onError) onError(ec);
        return;
    }

    if (onConnected) onConnected();

    doRead();
}

void WSConnection::doRead() {
    auto self = shared_from_this();

    ws_.async_read(
        buffer_,
        [this, self](beast::error_code ec, std::size_t bytes) {
            onRead(ec, bytes);
        }
    );
}

void WSConnection::onRead(beast::error_code ec, std::size_t) {
    if (ec) {
        if (onClosed) onClosed();
        return;
    }

    std::string msg = beast::buffers_to_string(buffer_.data());
    buffer_.clear();

    if (onMessage) onMessage(msg);

    doRead();
}

void WSConnection::send(const std::string& msg) {
    bool idle = writeQueue_.empty();

    if (idle) {
        doWrite();
    }
}

void WSConnection::doWrite() {
    auto self = shared_from_this();
    ws_.async_write(
        asio::buffer(writeQueue_.front()),
        [this, self](beast::error_code ec, std::size_t bytes) {
            onWrite(ec, bytes);
        }
    );
}

void WSConnection::onWrite(beast::error_code ec, std::size_t) {
    if (ec) {
        if (onError) onError(ec);
        return;
    }

    writeQueue_.pop();
    if (!writeQueue_.empty()) {
        doWrite();
    }
}

void WSConnection::close() {
    auto self = shared_from_this();
    ws_.async_close(
        websocket::close_code::normal,
        [this, self](beast::error_code ec) {
            if (ec) {
                if (onError) onError(ec);
                return;
            }

            if (onClosed) onClosed();
        }
    );
}



