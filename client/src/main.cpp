#include "ClientApp.hpp"
#include "Protocol.hpp"
#include "Message.hpp"

#include <boost/asio.hpp>
#include <thread>
#include <string>
#include <iostream>

int main() {
    try {
        boost::asio::io_context io;
        ClientApp app(io);

        app.addServer("127.0.0.1", "8080");

        std::thread t([&io] {
            io.run();
        });

        // Message msg(Protocol::CMD::PING, "hello server");
        // app.sendMessageToAll(msg);

        std::cout << "-- CHAT STARTED -- \n";
        std::cout << "Type message and press Enter to send, type \"quit\" to exit. \n";

        std::string line;
        while (std::getline(std::cin, line)) {
            if (line == "quit") break;

            if (line.empty()) {
                std::cout << "[Client] : input empty\n";
                continue;
            }

            Message msg(Protocol::CMD::BROADCAST, line);
            std::cout << "[Client]: input - " << line << "\n";
            app.sendMessageToAll(msg);
        }

        std::cout << "[Client] Stopping..." << "\n";
        io.stop();
        if (t.joinable()) t.join();
    } catch (const std::exception& e) {
        std::cerr << "[Client] Exception: " << e.what() << "\n";
    }
}