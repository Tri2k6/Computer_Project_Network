macro(apply_platform_config)
    message(STATUS "--- macOS Header-Only Boost Configuration ---")

    execute_process(COMMAND brew --prefix boost OUTPUT_VARIABLE BOOST_PREFIX OUTPUT_STRIP_TRAILING_WHITESPACE)
    execute_process(COMMAND brew --prefix openssl@3 OUTPUT_VARIABLE OPENSSL_PREFIX OUTPUT_STRIP_TRAILING_WHITESPACE)

    if(TARGET agent)
        target_include_directories(agent PRIVATE 
            "${BOOST_PREFIX}/include"
            "${OPENSSL_PREFIX}/include"
        )

        target_compile_definitions(agent PRIVATE 
            BOOST_SYSTEM_NO_LIB 
            BOOST_DATE_TIME_NO_LIB
            BOOST_REGEX_NO_LIB
        )

        find_library(SSL_LIB NAMES ssl PATHS "${OPENSSL_PREFIX}/lib" NO_DEFAULT_PATH)
        find_library(CRYPTO_LIB NAMES crypto PATHS "${OPENSSL_PREFIX}/lib" NO_DEFAULT_PATH)

        target_link_libraries(agent PRIVATE 
            ${SSL_LIB}
            ${CRYPTO_LIB}
            "-framework ApplicationServices"
            "-framework Carbon"
            "-framework Foundation"
            "-framework CoreFoundation"
            "pthread"
            "dl"
        )

        message(STATUS "SUCCESS: macOS configured (Boost: Header-only, OpenSSL: Linked)")
    endif()
endmacro()