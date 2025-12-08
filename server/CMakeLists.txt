cmake_minimum_required(VERSION 3.14)

project(ServerApp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- KHẮC PHỤC LỖI BOOST ---
# Ép buộc CMake dùng FindBoost.cmake có sẵn thay vì BoostConfig.cmake bị lỗi
set(Boost_NO_BOOST_CMAKE ON) 
# Tắt cảnh báo về Policy CMP0167 (nếu có)
if(POLICY CMP0167)
    cmake_policy(SET CMP0167 OLD)
endif()

# 1. Tìm gói Boost (Bắt buộc)
find_package(Boost REQUIRED COMPONENTS filesystem thread)

# 2. Tìm gói nlohmann_json (Nếu bạn dùng vcpkg hoặc brew)
find_package(nlohmann_json QUIET) 

# Include paths cho hệ thống (Hỗ trợ cả Intel và Apple Silicon)
include_directories(/usr/local/include)
include_directories(/opt/homebrew/include)

# Include header của Boost tìm được
if(Boost_FOUND)
    include_directories(${Boost_INCLUDE_DIRS})
endif()

# Project headers
include_directories(${CMAKE_SOURCE_DIR}/include)

# Find source files
file(GLOB SERVER_SRC
    "${CMAKE_SOURCE_DIR}/src/*.cpp"
    "${CMAKE_SOURCE_DIR}/src/module/*.cpp"
)

add_executable(server ${SERVER_SRC})

# 3. Liên kết thư viện (Link Libraries)
# Sử dụng biến Boost_LIBRARIES thay vì target nếu Module mode không tạo target
if(TARGET Boost::system)
    target_link_libraries(server PRIVATE Boost::system Boost::thread)
else()
    target_link_libraries(server PRIVATE ${Boost_LIBRARIES})
endif()

# Link JSON nếu tìm thấy
if(nlohmann_json_FOUND)
    target_link_libraries(server PRIVATE nlohmann_json::nlohmann_json)
endif()

# Cấu hình riêng cho từng hệ điều hành
if(UNIX)
    target_link_libraries(server PRIVATE pthread)
elseif(WIN32)
    target_link_libraries(server PRIVATE ws2_32 mswsock iphlpapi)
endif()