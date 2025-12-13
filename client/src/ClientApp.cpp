#include "ClientApp.hpp"

ClientApp::ClientApp(boost::asio::io_context& io, DiscoveryService& discovery) : io_(io), discovery_(discovery) {}

void ClientApp::connectToWebServer(const std::string& host, const std::string& port) {
    webConn_ = std::make_shared<WSConnection>(io_, host, port);

    webConn_->onConnected = [this]() {
        std::cout << "[Gateway] Connected to WEB!\n";

        //Message authMsg(Protocol::TYPE::AUTH, {{}})
        this->sendServerListToWeb();
    };

    webConn_->onMessage = [this](const std::string& msg) {
        this->onWebMessage(msg);
    };

    webConn_->onError = [](boost::beast::error_code ec) {
        std::cerr << "[Gateway] Web connection error: " << ec.message() << "\n";
    };

    webConn_->connect();
}

void ClientApp::onWebMessage(const std::string& rawMsg) {
    try {
        Message msg = Message::deserialize(rawMsg);
        std::cout << "[Web -> Gateway] Type: " << msg.type << "\n";

        if (msg.type == Protocol::TYPE::GET_AGENTS) {
            sendServerListToWeb();
            return;
        }
        
        if (msg.type == Protocol::TYPE::CONNECT_AGENT) {
            std::string ip = msg.data.value("ip", "");
            std::string port = msg.data.value("port", "8080");
            if (!ip.empty()) {
                connectToAgent(ip, port);
            }
        }

        if (msg.type == Protocol::TYPE::BROADCAST) {
            if (msg.data.contains("payload")) {
                Message innerMsg = Message::deserialize(msg.data["payload"].dump());
                broadcastToAgents(innerMsg);
            }
            return;
        }

        int targetId = -1;

        if (msg.data.contains("targetId")) {
            targetId = msg.data["targetId"].get<int>();
        }

        if (targetId >= 0) {
            forwardToAgent(targetId, msg);
        } else {
            std::cerr << "[Gateway] Command missing targetId.\n";
        }
        
    } catch (const std::exception& e) {
        std::cerr << "[Gateway] Json Parse Error from Web: " << e.what() << "\n";
    }
}

void ClientApp::sendServerListToWeb() {
    if (!webConn_ || !webConn_->isOpen()) return;
    auto list = discovery_.getList();
    json jArray = json::array();

    for (const auto& s : list) {
        jArray.push_back({
            {"name", s.name},
            {"ip", s.ip},
            {"port", s.port}
        });
    }

    Message response(Protocol::TYPE::GET_AGENTS, {
        {"status", "ok"},
        {"data", jArray},
        {"msg", "Get agents successfully"}
    });
    webConn_->send(response.serialize());
}

void ClientApp::connectToAgent(const std::string& host, const std::string& port) {
    auto conn = std::make_shared<WSConnection>(io_, host, port);

    size_t currId = agentManager_.size();

    conn->onConnected = [host, currId, this]() {
        std::cout << "[Agent #" << currId << "] Connected (" << host << ")\n";
        
        if (webConn_ && webConn_->isOpen()) {
            Message statusMsg(Protocol::TYPE::AGENT_STATUS, {
                {"status", "connected"},
                {"index", currId},
                {"ip", host}
            });
            webConn_->send(statusMsg.serialize());
        }
    };

    conn->onMessage = [host, currId, this](const std::string& rawMsg) {
        this->onAgentMessage(currId, host, rawMsg);
    };

    conn->onError = [currId](boost::beast::error_code ec) {
        std::cerr << "[ Agent #" << currId << "] Error : " << ec.message() << "\n";
    };

    conn->onClosed = [host, currId, this]() {
        std::cout << "[ Agent #" << currId << "] Connection closed" << "\n";
        if (webConn_ && webConn_->isOpen()) {
            Message statusMsg(Protocol::TYPE::AGENT_STATUS, {
                {"status", "disconnected"},
                {"index", currId}
            });
            webConn_->send(statusMsg.serialize());
        }
    };

    agentManager_.addConnection(conn);
    conn->connect();
}

void ClientApp::onAgentMessage(int id, const std::string& ip, const std::string& rawMsg) {
    if (webConn_ && webConn_->isOpen) {
        json payload;
        try {
            payload = json::parse(rawMsg);
        } catch(...) {
            payload = rawMsg;
        }

        Message responese(Protocol::TYPE::
    }
}

void ClientApp::run() {
    std::cout << "[ClientApp] RunningClient...\n";
    io_.run();
}