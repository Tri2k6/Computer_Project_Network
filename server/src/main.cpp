#include "feature_library.h"

// --- PHẦN XỬ LÝ ĐA NỀN TẢNG (CROSS-PLATFORM) ---
#ifdef _WIN32
    #include <windows.h>
    #define HOST_NAME_MAX 256 // Windows không có define này sẵn
#else
    #include <unistd.h>
    #include <limits.h>
    #ifndef HOST_NAME_MAX
        #define HOST_NAME_MAX 256
    #endif
#endif

// Hàm lấy tên máy tính hoạt động trên cả Windows, Mac và Linux
std::string getHostName() {
#ifdef _WIN32
    char buffer[MAX_COMPUTERNAME_LENGTH + 1];
    DWORD size = MAX_COMPUTERNAME_LENGTH + 1;
    if (GetComputerNameA(buffer, &size)) {
        return std::string(buffer);
    }
#else
    char buffer[HOST_NAME_MAX];
    if (gethostname(buffer, sizeof(buffer)) == 0) {
        return std::string(buffer);
    }
#endif
    return "Unknown_Server";
}

// Hàm thiết lập console UTF-8 (Chỉ cần cho Windows)
void setupConsole() {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
#endif
    // Linux/Mac thường mặc định là UTF-8 nên không cần làm gì
}

int main() {
    setupConsole(); 

    try {
        asio::io_context io;
        
        std::string myName = getHostName();
        std::cout << "=======================================\n";
        std::cout << " SERVER STARTING ON: " << myName << "\n";
        std::cout << "=======================================\n";

        auto router = std::make_shared<Router>();

        // Handler Echo cũ
        router->registerHandler(
            "echo",
            [](const Message& msg, Router::SessionPtr session) {
                //std::cout << "[Handler] Processing echo for: " << msg->data << "\n";
                std::string data;
                if (msg.data.is_string()) 
                    data = msg.data.get<std::string>();
                else 
                    data = msg.data.dump();
                Message reply("echo_result", "Server says: " + data);
                session->send(reply.serialize());
            }
        );

        // Handler whoami
        router->registerHandler(
            "whoami",
            [myName](const Message& msg, Router::SessionPtr session) {
                Message reply("whoami_result", myName);
                session->send(reply.serialize());
                std::cout << "[Handler] Identified myself to client as: " << myName << "\n";
            }
        );

        auto server = std::make_shared<WSServer>(io, 8080, router);
        
        Gateway gateway(*server, router);

        server->setMessageHandler(
            [&gateway](WSServer::SessionPtr session, const Message& msg) {
                gateway.onMessage(session, msg);
            }
        );

        server->start();

        // Discovery Service
        DiscoveryService discovery(io);
        discovery.openSocket(0);
        discovery.startAdvertising(myName, 8080);

        asio::signal_set signals(io, SIGINT, SIGTERM);
        signals.async_wait(
            [&io](beast::error_code const&, int) {
                io.stop();
                std::cout << "\n [Server] Stopping...\n";
            }
        );
        
        std::cout << "[INFO] Websocket server running on ws://localhost:8080" << std::endl;
        std::cout << "[INFO] Discovery broadcasting as: " << myName << std::endl;
        io.run();
    } catch (const std::exception& e) {
        std::cerr << "[MAIN ERROR]: " << e.what() << std::endl;
    }
}