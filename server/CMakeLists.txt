cmake_minimum_required(VERSION 3.14)

project(ServerApp LANGUAGES CXX)

include_directories(/usr/local/include)
include_directories(/opt/homebrew/include)

include_directories(${CMAKE_SOURCE_DIR}/server/include)

file(GLOB SERVER_SRC
    "${CMAKE_SOURCE_DIR}/server/src/*.cpp"
    "${CMAKE_SOURCE_DIR}/server/src/module/*.cpp"
)

add_executable(server ${SERVER_SRC})

if(UNIX)
    target_link_libraries(server pthread)
endif()
