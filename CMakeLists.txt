cmake_minimum_required(VERSION 3.15)
project(Computer_Project_Network CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Boost QUIET)

if(NOT Boost_FOUND)
    message(WARNING "CMake không tự tìm thấy Boost, đang sử dụng đường dẫn mặc định của macOS...")
    if(EXISTS "/opt/homebrew/include/boost")
        set(Boost_INCLUDE_DIRS "/opt/homebrew/include")
        message(STATUS "Đã chọn thủ công: /opt/homebrew/include")
    elseif(EXISTS "/usr/local/include/boost")
        set(Boost_INCLUDE_DIRS "/usr/local/include")
        message(STATUS "Đã chọn thủ công: /usr/local/include")
    else()
        message(FATAL_ERROR "KHÔNG TÌM THẤY BOOST! Bạn đã chạy 'brew install boost' chưa?")
    endif()
else()
    message(STATUS "Đã tìm thấy Boost tại: ${Boost_INCLUDE_DIRS}")
endif()
# -----------------------------

file(GLOB_RECURSE SOURCES "*.cpp")

if(NOT SOURCES)
    message(FATAL_ERROR "Không tìm thấy bất kỳ file .cpp nào trong thư mục này hoặc thư mục con.")
endif()

add_executable(my_client
    src/client/client.cpp
)

add_executable(my_server
    src/server/server.cpp
)

target_include_directories(my_server PRIVATE ${Boost_INCLUDE_DIRS}) 
target_include_directories(my_client PRIVATE ${Boost_INCLUDE_DIRS})

target_link_libraries(my_server PRIVATE ${Boost_LIBRARIES})
target_link_libraries(my_client PRIVATE ${Boost_LIBRARIES})