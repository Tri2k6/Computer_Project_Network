cmake_minimum_required(VERSION 3.14)

project(ClientApp LANGUAGES CXX)

include_directories(/usr/local/include)
include_directories(/opt/homebrew/include)

include_directories(${CMAKE_SOURCE_DIR}/include)

if(WIN32)
    include_directories(C:/vcpkg/installed/x64-windows/include)
endif()

file(GLOB CLIENT_SRC
    "${CMAKE_SOURCE_DIR}/src/*.cpp"
)

add_executable(client ${CLIENT_SRC})

if(UNIX)
    target_link_libraries(client pthread)
endif()
