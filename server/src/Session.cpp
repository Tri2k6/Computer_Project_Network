#include "Session.hpp"

#include <iostream>

bool Session::isLoggedIn() const {
    return isAuthenticated_;
}

void Session::setAuthenticated(bool value) {
    isAuthenticated_ = value;
}

void Session::start(MessageHandler handler) {
    messageHandler_ = handler;
    
    auto self = shared_from_this();

    ws_.async_accept([self](beast::error_code ec) {
        if (ec) {
            std::cerr << "[Session] Handshake error: " << ec.message() << "\n";
            return;
        }
        
        self->doRead();
    });
}

void Session::send(const std::string& msg) {
    bool writeInProgress = !writeQueue_.empty();
    writeQueue_.push(msg);

    if (!writeInProgress) {
        doWrite();
    }
}

void Session::doRead() {
    auto self = shared_from_this();
    ws_.async_read(
        buffer_,
        [self](beast::error_code ec, std::size_t) {
            if (ec) {
                std::cerr << "[Session] Read error: " << ec.message() << "\n";
                if (self->onClosed) self->onClosed(self);
                return;
            }

            std::string msg = beast::buffers_to_string(self->buffer_.data());
            self->buffer_.clear();

            if (self->messageHandler_) {
                self->messageHandler_(msg, self);
            }

            self->doRead();
        }
    );
}

void Session::doWrite() {
    auto self = shared_from_this();
    ws_.async_write(
        asio::buffer(writeQueue_.front()),
        [self](beast::error_code ec, std::size_t) {
            if (ec) {
                std::cerr << "[Session] Write error: " << ec.message() << "\n";
                return;
            }

            self->writeQueue_.pop();
            if (!self->writeQueue_.empty()) {
                self->doWrite();
            }
        }
    );
}

websocket::stream<beast::tcp_stream>& Session::getSocket() {
    return ws_;
}