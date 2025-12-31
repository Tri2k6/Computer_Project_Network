macro(apply_platform_config)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_WIN\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")

    find_package(Boost REQUIRED COMPONENTS system thread)
    find_package(OpenSSL REQUIRED)
    find_package(X11 REQUIRED)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(XTST REQUIRED xtst)

    target_include_directories(agent PRIVATE ${X11_INCLUDE_DIR} ${XTST_INCLUDE_DIRS}) #

    target_link_libraries(agent PRIVATE 
        Boost::system Boost::thread
        OpenSSL::SSL OpenSSL::Crypto
        pthread 
        ${X11_LIBRARIES}    
        ${XTST_LIBRARIES} #
    )

    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        target_link_options(agent PRIVATE "-Wl,--gc-sections" "-s")
        add_compile_options(-O3 -flto -ffunction-sections -fdata-sections)
    endif()
endmacro()