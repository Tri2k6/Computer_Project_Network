#include <iostream>
#include <thread>
#include <chrono>


#include "WebSocketClient.hpp"
#include "WebSocketService.hpp"

int main() {
   WebSocketService my_service;
   my_service.connect("127.0.0.1", "8080", "/");

   std::this_thread::sleep_for(std::chrono::seconds(2));
   std::cout << "Connected!\n";
   std::string request;
   while (std::getline(std::cin, request)) {
        if (request == "quit") {
            break;
        }
        if (request.empty()) {
            continue;
        }
        my_service.send(request);
   }
   std::cout << "exit..." << std::endl;
   return 0;
}

