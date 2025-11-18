#include "ClientApp.hpp"
#include "Protocol.hpp"
#include "Message.hpp"
#include "Discovery.hpp"

#include <boost/asio.hpp>
#include <thread>
#include <string>
#include <iostream>

int main() {
    try {
        boost::asio::io_context io;
        ClientApp app(io);
        DiscoveryService discovery(io);
        discovery.openSocket(8888);
        discovery.startScanning();

        std::thread t([&io] {
            io.run();
        });

        // Message msg(Protocol::CMD::PING, "hello server");
        // app.sendMessageToAll(msg);

        std::cout << "=========================================\n";
        std::cout << "          CHAT CLIENT STARTED            \n";
        std::cout << "=========================================\n";
        std::cout << "Commands:\n";
        std::cout << "  list               : Find servers in LAN\n";
        std::cout << "  connect <index>    : Connect to server (e.g., connect 0)\n";
        std::cout << "  quit               : Exit\n";
        std::cout << "  <any text>         : Broadcast message\n";
        std::cout << "=========================================\n";

        std::string line;
        while (std::getline(std::cin, line)) {
            if (line == "quit") break;
            if (line == "list") {
                discovery.listServers();
                continue;
            }
            
            if (line.length() > 8 && line.substr(0, 8) == "connect ") {
                try {
                    std::string indexStr = line.substr(8);
                    int index = std::stoi(indexStr);
                    discovery.connectTo(index, app);
                    continue;
                } catch (const std::exception& e) {
                    std::cout << "[Error] Invalid syntax. Usage: connect <number> (e.g., connect 0)\n"; 
                }
            }

            if (line.empty()) {
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
    
    return 0;
}