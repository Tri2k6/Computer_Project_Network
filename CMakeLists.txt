cmake_minimum_required(VERSION 3.14)
project(WebSocketSystem LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- 1. CẤU HÌNH PATH CHO MAC (Intel/Rosetta) ---
# Dựa vào log của bạn, máy bạn đang dùng /usr/local (Intel Mac hoặc Rosetta)
if(APPLE)
    include_directories(/usr/local/include)
    link_directories(/usr/local/lib)
endif()

if(WIN32)
    add_compile_definitions(_WIN32_WINNT=0x0A00)
    add_compile_definitions(WIN32_LEAN_AND_MEAN)
    add_compile_options(/utf-8)
endif()

# --- 2. SỬA LỖI BOOST 1.89 ---

# Tắt cảnh báo phiền phức về Policy CMP0167
cmake_policy(SET CMP0167 OLD)

# Ép CMake dùng chế độ tìm kiếm cổ điển (Module Mode)
set(Boost_NO_BOOST_CMAKE ON)

# Gợi ý đường dẫn cụ thể để CMake không bị lạc
set(BOOST_ROOT "/usr/local")
set(Boost_INCLUDE_DIR "/usr/local/include")
set(Boost_LIBRARY_DIR "/usr/local/lib")

# QUAN TRỌNG: Chỉ tìm "thread". 
# Bỏ "system" đi vì Boost 1.89 system là header-only, tìm library sẽ bị lỗi.
find_package(Boost REQUIRED COMPONENTS thread)

if(Boost_FOUND)
    include_directories(${Boost_INCLUDE_DIRS})
    link_directories(${Boost_LIBRARY_DIRS})
    message(STATUS "Boost found headers: ${Boost_INCLUDE_DIRS}")
    message(STATUS "Boost found libs: ${Boost_LIBRARIES}")
endif()

# --- 3. ADD MODULES ---
add_subdirectory(client)
add_subdirectory(server)