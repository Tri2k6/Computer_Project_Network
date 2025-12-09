import asyncio
import websockets
import json

# Cấu hình Server
URI = "ws://localhost:8080"
# User/Pass mặc định trong Gateway.cpp (SHA-256 hash của chuỗi rỗng? hay chuỗi cụ thể nào đó)
# Trong code Gateway bạn dùng hash: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
# Nếu đó là hash của "admin", hãy nhập "admin" vào đây để test hash (nếu client tự hash).
# Nhưng protocol hiện tại gửi hash trực tiếp, nên ta gửi y nguyên chuỗi hash.
HASH_USER = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
HASH_PASS = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"

async def test_server():
    async with websockets.connect(URI) as websocket:
        print(f"[Client] Connected to {URI}")

        # 1. Thử gửi lệnh khi CHƯA đăng nhập (Mong đợi lỗi)
        print("\n--- TEST 1: Unauthenticated Command ---")
        await websocket.send(json.dumps({
            "type": "LISTAPP",
            "data": ""
        }))
        response = await websocket.recv()
        print(f"[Server] {response}")

        # 2. Gửi lệnh Đăng nhập (AUTH)
        print("\n--- TEST 2: Login ---")
        login_msg = {
            "type": "auth",
            "data": {
                "user": HASH_USER,
                "pass": HASH_PASS
            }
        }
        await websocket.send(json.dumps(login_msg))
        response = await websocket.recv()
        print(f"[Server] {response}")

        # 3. Gửi lệnh lấy danh sách App (LISTAPP) sau khi đã login
        print("\n--- TEST 3: List Apps ---")
        await websocket.send(json.dumps({
            "type": "LISTAPP",
            "data": ""
        }))
        response = await websocket.recv()
        # In tối đa 200 ký tự để đỡ rối mắt
        print(f"[Server] {response[:200]}...") 

        # 4. Thử lệnh Screenshot (SCRSHOT)
        print("\n--- TEST 4: Screenshot ---")
        await websocket.send(json.dumps({
            "type": "SCRSHOT",
            "data": "test_scr"
        }))
        response = await websocket.recv()
        print(f"[Server] {response}")

        # 5. Thử lệnh Webcam (cam_record) - Quay 3 giây
        print("\n--- TEST 5: Webcam Record (3s) ---")
        await websocket.send(json.dumps({
            "type": "cam_record",
            "data": "3"
        }))
        response = await websocket.recv()
        print(f"[Server] {response}")

if __name__ == "__main__":
    # Cài thư viện: pip install websockets
    asyncio.run(test_server())