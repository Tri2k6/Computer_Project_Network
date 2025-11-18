#include "ClientApp.hpp"

ClientApp::ClientApp(boost::asio::io_context& io) : io_(io) {}

void ClientApp::addServer(const std::string& host, const std::string& port) {
    auto conn = std::make_shared<WSConnection>(io_, host, port);

    conn->onMessage = [host](const std::string& rawMsg) {
        Message msg = Message::deserialize(rawMsg);
        std::cout << "[" << host << "]" << msg.cmd << " : " << msg.data << "\n"; 
    };

    conn->onConnected = [host, this]() {
        std::cout << "[" << host << "] Connected to server" << "\n";

        Message msg(Protocol::CMD::PING, "Hello form " + host);
    };

    conn->onError = [host](boost::beast::error_code ec) {
        std::cerr << "[" << host << "] Error : " << ec.message() << "\n";
    };

    conn->onClosed = [host]() {
        std::cout << "[" << host << "] Connection closed" << "\n";
    };

    manager_.addConnection(conn);
    conn->connect();
}

void ClientApp::sendMessageToAll(const Message& msg) {
    manager_.broadcast(msg.serialize());
}

void ClientApp::sendMessageTo(size_t index, const Message& msg) {
    manager_.sendTo(index, msg.serialize());
}

void ClientApp::run() {
    std::cout << "[ClientApp] RunningClient...\n";
    io_.run();
}