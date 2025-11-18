#pragma once

#include <boost/asio.hpp>
#include <nlohmann/json.hpp>

#include <iostream>
#include <set>
#include <mutex>
#include <vector>
#include <iomanip>

using json = nlohmann::json;
using boost::asio::ip::udp;
using boost::asio::ip::address;

class DiscoveryService {
public:
    struct ServerInfo {
        std::string ip;
        std::string port;
        std::string name;

        bool operator<(const ServerInfo& other) const {
            return ip + ":" + port < other.ip + ":" + other.port;
        }
    };

    DiscoveryService(boost::asio::io_context& io)
        : io_(io), socket_(io), timer_(io)
    {
    
    }

    void startAdvertising(const std::string& name, int tcpPort) {
        json j{
            {"cmd", "announce"},
            {"name", name},
            {"port", std::to_string(tcpPort)}
        };
        broadcastMsg_ = j.dump();

        std::cout << "[Discovery] Advertising as: " << name << "\n";
        doBroadcast();
    }

    void startScanning() {
        std::cout << "[Discovery] Starting scan on UDP 8888...\n";
        doReceive();
    }

    std::vector<ServerInfo> getList() {
        std::lock_guard<std::mutex> lock(mutex_);
        return std::vector<ServerInfo>(servers_.begin(), servers_.end());
    }

    void listServers() {
        auto list = getList();

        std::cout << "\n" << std::string(45, '=') << "\n";
        std::cout << "           AVAILABLE SERVERS           \n";
        std::cout << std::string(45, '=') << "\n";

        if (list.empty()) {
            std::cout << "(Scanning... wait a moment)\n";
        } else {
            std::cout << std::left << std::setw(4) << "ID"
                      << std::setw(20) << "NAME"
                      << "ADDRESS\n";
            std::cout << std::string(45, '-') << "\n";

            for (int i = 0; i < list.size(); i++) {
                std::cout << "[" << i << "] "
                          << std::setw(20) << list[i].name
                          << list[i].ip << ":" << list[i].port << "\n";
            }
        }
        std::cout << std::string(45, '=') << "\n";
    }

    template <typename AppType>
    void connectTo(int index, AppType& app) {
        auto srv = getList();

        if (index < 0 || index >= srv.size()) {
            std::cout << "[Error] Invalid index.\n";
            return;
        }

        const auto& s = srv[index];
        std::cout << "[Client] Connecting to " << s.name
                  << " at " << s.ip << ":" << s.port << "\n";

        app.addServer(s.ip, s.port);
    }

    void openSocket(int portToBind = 0) {
        boost::system::error_code ec;

        socket_.open(udp::v4(), ec);
        socket_.set_option(boost::asio::socket_base::reuse_address(true));

#if defined(SO_REUSEPORT)
        socket_.set_option(boost::asio::detail::socket_option::boolean<
            SOL_SOCKET, SO_REUSEPORT>(true));
#endif

        // Allow multicast loopback
        socket_.set_option(boost::asio::socket_base::broadcast(true));
        socket_.set_option(boost::asio::ip::multicast::enable_loopback(true));

        // Join multicast group
        socket_.bind(udp::endpoint(udp::v4(), portToBind), ec);
        if (ec) {
            std::cerr << "[Discovery] Bind failed: " << ec.message() << "\n";
            return;
        } 

        if (portToBind == 8888) {
            socket_.set_option(boost::asio::ip::multicast::join_group(
                boost::asio::ip::make_address("239.255.0.1")
            ));
            std::cout << "[Info] Joined multicast group on port 8888.\n";
        }
    }


private:
    boost::asio::io_context& io_;
    udp::socket socket_;
    udp::endpoint sender_;
    boost::asio::steady_timer timer_;

    std::string broadcastMsg_;
    std::mutex mutex_;
    std::set<ServerInfo> servers_;

    enum { MAX_BUF = 2048 };
    char data_[MAX_BUF];

    
    void doBroadcast() {
        udp::endpoint bcast(boost::asio::ip::make_address("255.255.255.255"), 8888);
        udp::endpoint loop(boost::asio::ip::make_address("127.0.0.1"), 8888);
        udp::endpoint mcast(boost::asio::ip::make_address("239.255.0.1"), 8888);

        socket_.set_option(boost::asio::socket_base::broadcast(true));

        // Broadcast
        socket_.async_send_to(boost::asio::buffer(broadcastMsg_), bcast,
            [](auto, auto) {}
        );

        // Loopback (same machine discovery)
        socket_.async_send_to(boost::asio::buffer(broadcastMsg_), loop,
            [](auto, auto) {}
        );

        // Multicast
        socket_.async_send_to(boost::asio::buffer(broadcastMsg_), mcast,
            [](auto, auto) {}
        );

        // Repeat every 3 seconds
        timer_.expires_after(std::chrono::seconds(3));
        timer_.async_wait([this](auto ec) {
            if (!ec) doBroadcast();
        });
    }

    void doReceive() {
        socket_.async_receive_from(
            boost::asio::buffer(data_, MAX_BUF), sender_,
            [this](boost::system::error_code ec, std::size_t len)
            {
                if (!ec && len > 0) {
                    processPacket(std::string(data_, len));
                }
                doReceive();
            }
        );
    }

    void processPacket(const std::string& raw) {
        try {
            auto j = json::parse(raw);

            if (j["cmd"] == "announce") {
                ServerInfo info;
                info.ip = sender_.address().to_string();
                info.port = j["port"];
                info.name = j["name"];

                std::lock_guard<std::mutex> lock(mutex_);

                bool isNew = servers_.insert(info).second;

                if (isNew) {
                    std::cout << "\n[Discovery] New server found: "
                              << info.name << " (" << info.ip << ":" << info.port << ")\n";
                }
            }

        } catch (...) {
            // Ignore malformed packets
        }
    }
};
