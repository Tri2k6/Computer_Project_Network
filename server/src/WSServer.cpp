#include "WSServer.hpp"

WSServer::WSServer(asio::io_context& io, uint16_t port, std::shared_ptr<Router> router)
    : acceptor_(io, tcp::endpoint(tcp::v4(), port)),
      socket_(io),
      router_(router) {}

void WSServer::start() {
    doAccept();
}

void WSServer::doAccept() {
    auto self = shared_from_this();
    socket_ = tcp::socket(acceptor_.get_executor());

    acceptor_.async_accept(
        socket_,
        [self](beast::error_code ec) {
            if (ec) {
                std::cerr << "[Server] Accept error: " << ec.message() << "\n";

                if (ec == asio::error::no_descriptors) {
                    auto timer = std::make_shared<asio::steady_timer>(self->acceptor_.get_executor(), std::chrono::seconds(1));
                    timer->async_wait([self](beast::error_code) {
                        self->doAccept();
                    });

                    return;
                }
            } else {
                auto session = std::make_shared<Session>(std::move(self->socket_));
                self->onNewSession(session);
            }
            self->doAccept();
        }
    );
}

void WSServer::onNewSession(SessionPtr session) {
    sessions_.insert(session);
    
    session->onClosed = [this](SessionPtr s) {
        sessions_.erase(s);
        std::cout << "[Server] Client disconnected. Remaining: " << sessions_.size() << "\n";
    };

    std::cout << "[Server] New client connected. Total: "
              << sessions_.size() << "\n";
    
    auto self = shared_from_this();

    session->start(
        [self](const std::string& rawMsg, SessionPtr s) {
            self->onClientMessage(rawMsg, s);
        }
    );
}

void WSServer::onClientMessage(const std::string& raw, SessionPtr session) {
    std::cout << "[Server] Received: " << raw << "\n";
    Message msg = Message::deserialize(raw);

    if (!Protocol::isValidCommand(msg.type)) {

        Message err(
            Protocol::TYPE::ERROR,
            Protocol::ERROR::INVALID_CMD
        );

        session->send(err.serialize());
        return;
    }

    // session->send(Message::deserialize(ans).serialize());
    if (customHandler_) {
        customHandler_(session, msg);
    } else {
        router_->dispatch(msg, session);
    }
}

void WSServer::broadcast(const Message& msg) {
    std::string data = msg.serialize();
    for (auto& s : sessions_) {
        s->send(data);
    }
}

void WSServer::setMessageHandler(MessageHandler handler) {
    customHandler_ = handler;
}



