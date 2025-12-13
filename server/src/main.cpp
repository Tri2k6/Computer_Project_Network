#include "FeatureLibrary.h"
#include "Agent.hpp"

int main() {
    cout << "[Main] Debug 1\n";
    setupConsole();

    try {
        boost::asio::io_context io;

        boost::asio::signal_set signals(io, SIGINT, SIGTERM);
        signals.async_wait([&io](const boost::system::error_code&, int) {
            std::cout << "\n[Main] Signal received. Stopping Agent...\n";
            io.stop();
        });

        //std::cout << "[Debug] Creating Agent...\n" << std::flush;
        auto agent = std::make_shared<Agent>(io);
        
        //std::cout << "[Debug] Calling agent->run()...\n" << std::flush;
        agent->run();

        std::cout << "===========================================\n";
        std::cout << "   AGENT CLIENT STARTED - RUNNING...       \n";
        std::cout << "===========================================\n";

        io.run();

    } catch (const std::exception& e) {
        std::cerr << "\n[FATAL ERROR] " << e.what() << "\n";
        // Giữ màn hình để đọc lỗi
        system("pause");
        return 1;
    } catch (...) {
        std::cerr << "\n[CRITICAL] Unknown Crash!\n";
        system("pause");
        return 1;
    }

    return 0;
}