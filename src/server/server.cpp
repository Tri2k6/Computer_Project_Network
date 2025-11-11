#include <boost/asio/ip/tcp.hpp>
#include <vector>
#include <thread>
#include <iostream>

#include "Listener.hpp"
#include "WebSocketSession.hpp"

namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

int main() {
    auto const address = net::ip::make_address("0.0.0.0");
    auto const port = static_cast<unsigned short>(8080);
    int const threads = 4;

    std::cout << "Server đang khởi động tại " << address << ":" << port << " với " << threads << " threads..." << std::endl;

    net::io_context ioc{threads};

    std::make_shared<Listener>(ioc, tcp::endpoint{address, port})->run();

    std::vector<std::thread> v;
    v.reserve(threads - 1);
    for(auto i = threads - 1; i > 0; --i) {
        v.emplace_back([&ioc]{ 
            try {
                ioc.run(); 
            } catch (std::exception& e) {
                std::cerr << "Server thread exception: " << e.what() << "\n";
            }
        });
    }
    try {
        ioc.run();
    } catch (std::exception& e) {
        std::cerr << "Server main thread exception: " << e.what() << std::endl;
    }

    for (auto& t : v) {
        if (t.joinable()) {
            t.join();
        }
    }

    return 0;
}