import http.server
import socketserver
import socket
import threading
import json
import time
import os

UDP_PORT = 8888       # Port Discovery.hpp
SERVER_PORT = 8080    # Port WebSocket
WEB_DIR = "Website" 

found_server = {
    "ip": None,
    "name": None,
    "last_seen": 0
}

def udp_listener():
    global found_server
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(('', UDP_PORT))
        print(f"[Backend] Listen UDP broadcast on port {UDP_PORT}...")
    except:
        print(f"[Error] Faild to bind port {UDP_PORT}.")
        return

    while True:
        try:
            data, addr = sock.recvfrom(1024)
            msg = json.loads(data.decode())
            if msg.get('cmd') == 'announce':
                # Cập nhật thông tin server
                found_server["ip"] = addr[0]
                found_server["name"] = msg.get('name', 'Unknown')
                found_server["last_seen"] = time.time()
                # print(f"[Discovery] Nhan tin hieu tu {found_server['ip']}")
        except:
            pass

def scan_network_fast():
    global found_server
    
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    except:
        local_ip = "127.0.0.1"
    s.close()

    prefix = ".".join(local_ip.split(".")[:3])
    print(f"[Scanner] Scan network {prefix}.x ...")

    def check_ip(ip):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.1) 
        result = sock.connect_ex((ip, SERVER_PORT))
        sock.close()
        if result == 0:
            return ip
        return None

    # multi thread
    found_ip = None
    threads = []

    def worker(start, end):
        nonlocal found_ip
        for i in range(start, end):
            if found_ip: return
            ip = f"{prefix}.{i}"
            if check_ip(ip):
                found_ip = ip

    batch_size = 64
    for i in range(1, 255, batch_size):
        t = threading.Thread(target=worker, args=(i, min(i+batch_size, 255)))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    if found_ip:
        found_server["ip"] = found_ip
        found_server["name"] = "Scanned Device"
        found_server["last_seen"] = time.time()
        return found_ip
    return None

# HTTP service
class LocalBridgeHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # API for web to ask server's ip
        if self.path == '/api/discover':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # try UDP first, if failed, scan
            if found_server["ip"] and (time.time() - found_server["last_seen"] < 10):
                resp = json.dumps({"status": "ok", "ip": found_server["ip"], "method": "udp"})
            else:
                ip = scan_network_fast()
                if ip:
                    resp = json.dumps({"status": "ok", "ip": ip, "method": "scan"})
                else:
                    resp = json.dumps({"status": "waiting"})
            
            self.wfile.write(resp.encode())
        else:
            if self.path == '/' or self.path == '/index.html':
                self.path = '/Website/index.html'
            elif self.path.startswith('/js/') or self.path.startswith('/css/'):
                self.path = '/Website' + self.path
            
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

# --- MAIN ---
if __name__ == "__main__":
    t_udp = threading.Thread(target=udp_listener, daemon=True)
    t_udp.start()

    PORT = 5500
    print(f"="*40)
    print(f"CLIENT RUNNER STARTED")
    print(f"Open Browser at: http://localhost:{PORT}")
    print(f"="*40)

    with socketserver.TCPServer(("", PORT), LocalBridgeHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass