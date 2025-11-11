#pragma once

#include <boost/asio/steady_timer.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/strand.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>

#include <functional>
#include <memory>
#include <string>
#include <vector>
#include <deque>
#include <iostream>
#include <thread>
#include <fstream>
#include <iomanip>
#include <chrono>
#include <sstream>

#include "WebSocketClient.hpp"

namespace net = boost::asio;
namespace fs = std::filesystem;

class WebSocketService {
private:
    
    enum class State {
        READY,
        WAITING_FOR_REPLY
    };

    net::io_context ioc_;
    net::executor_work_guard<net::io_context::executor_type> work_guard_;
    std::thread io_thread_;
    std::shared_ptr<WebSocketClient> client_;

    State current_state_ = State::READY;
    std::deque<std::string> pending_requests_queue_;
    net::steady_timer request_timer_;

public:
    WebSocketService() : work_guard_(net::make_work_guard(ioc_)), request_timer_(ioc_) {
        io_thread_ = std::thread([this]() {
            std::cout << "Network thread started." << std::endl;
            try { 
                ioc_.run();
            } catch (std::exception& e) {
                std::cerr << "Network thread exception: " << e.what() << std::endl;
            }
            std::cout << "Network thread stopped." << std::endl;
        });
    }

    ~WebSocketService() {
        stop();
    }

    void connect(const std::string& host, const std::string& port, const std::string& path = "/") {
        auto on_receive = [this](std::string msg) {
            net::post(ioc_, std::bind(&WebSocketService::on_reply_received, this, std::move(msg)));
        };

        client_ = std::make_shared<WebSocketClient>(ioc_, on_receive);

        std::cout << "⏳ Đang kết nối tới " << host << ":" << port << path << "..." << std::endl;
        client_->run(host.c_str(), port.c_str(), path.c_str());
    }

    void send(const std::string& msg) {
        net::post(ioc_, [this, msg]() {
            pending_requests_queue_.push_back(msg);
            try_process_next_request();
        });
    }

    void stop() {
        net::post(ioc_, [this]() {
            if (client_) client_->close();
            request_timer_.cancel();
            work_guard_.reset();
        });

        if (io_thread_.joinable()) {
            io_thread_.join();
        }
    }

private:
    void try_process_next_request() {
        if (current_state_ == State::READY && !pending_requests_queue_.empty() && client_ && client_->is_connected()) {
            std::string msg = pending_requests_queue_.front();
            pending_requests_queue_.pop_front();

            current_state_ = State::WAITING_FOR_REPLY;
            std::cout << "Request send: " << msg << "...waiting for reply...\n";
            client_->send(msg);

            request_timer_.expires_after(std::chrono::minutes(3));
            request_timer_.async_wait(
                std::bind(&WebSocketService::on_timeout, this, std::placeholders::_1)
            );
        }
    }

    void on_reply_received(std::string msg) {
        if (current_state_ != State::WAITING_FOR_REPLY) {
            std::cout << "Unwanted message: " << msg << "\n";
            return;
        }

        std::cout << "Reply: " << msg << "\n";

        save_result_to_file(msg);

        request_timer_.cancel();
        current_state_ = State::READY;

        try_process_next_request();
    }

    void on_timeout(beast::error_code ec) {
        if (ec == net::error::operation_aborted) {
            return;
        }

        if (ec) {
            std::cerr << "Error timer: " << ec.message() << std::endl;
        }

        if (current_state_ == State::WAITING_FOR_REPLY) {
            std::cerr << "Connection timeout!\n";
            current_state_ = State::READY;
            try_process_next_request();
        }
    }

    void save_result_to_file(const std::string& data) {
        const std::string folder_name = "results";
        try {
            if (!fs::exists(folder_name)) {
                fs::create_directory(folder_name);
            }

            auto now = std::chrono::system_clock::now();
            auto in_time_t = std::chrono::system_clock::to_time_t(now);

            std::stringstream ss;
            ss << folder_name << "/result_";
            ss << std::put_time(std::localtime(&in_time_t), "%Y%m%d_%H%M%S");
            ss << ".txt";
            std::string file_path = ss.str();
            
            std::ofstream output_file(file_path);
            if (output_file.is_open()) {
                output_file << data;
                output_file.close();
                std::cout << "Save result in " << file_path << "\n";
            } else {
                std::cerr << "Failed to export file!\n";
            }
        } catch (const std::filesystem::filesystem_error& e) {
            std::cerr << "File error: " << e.what() << "\n";
        } catch (const std::exception& e) {
            std::cerr << "Failed to save file: " << e.what() << "\n"; 
        }
    }
};