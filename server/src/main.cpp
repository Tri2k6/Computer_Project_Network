#include "WSServer.hpp"
#include "Router.hpp"
#include "Message.hpp"
#include "Protocol.hpp"
#include "Discovery.hpp"
#include "feature_library.h"

#include <boost/asio/signal_set.hpp>
#include <iostream>

int main() {
    SetConsoleOutputCP(CP_UTF8); // đổi sang UTF8 để khỏi bị lỗi ký tự tiếng Việt

    try {
        asio::io_context io;
        
        Router router;
        router.registerHandler(
            "echo",
            [](const Message& msg, Router::SessionPtr session) {
                std::cout << "[Handler] Processing echo for: " << msg.data << "\n";
                Message reply("echo_result", "Server says: " + msg.data);
                session->send(reply.serialize());
            }
        );

        auto server = std::make_shared<WSServer>(io, 8080, router);
        server->start();
        DiscoveryService discovery(io);
        discovery.openSocket(0);
        discovery.startAdvertising("Server 1", 8080);
        asio::signal_set signals(io, SIGINT, SIGTERM);
        signals.async_wait(
            [&io](beast::error_code const&, int) {
                io.stop();
                std::cout << "\n [Server] Stopping...\n";
            }
        );
        
        std::cout << "Websocket server running on ws://localhost:8080" << std::endl;
        io.run();
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
    }
}