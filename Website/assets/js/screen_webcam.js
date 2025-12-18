// ===============================================
// 0. STATE MANAGEMENT
// ===============================================

const screenWebcamState = {
    isProcessing: false,
    currentOperation: null,
    timeoutId: null,
    requestTimeout: 30000, // 30 seconds timeout
    lastError: null
};

// ===============================================
// 0.1 HELPER: Initialize agent target
// ===============================================

function initAgentTarget() {
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('id');
    
    if (agentId) {
        const checkAndSetTarget = () => {
            if (window.gateway && window.gateway.isAuthenticated) {
                // Đợi agents list được load trước
                if (window.gateway.agentsList && window.gateway.agentsList.length > 0) {
                    window.gateway.setTarget(agentId);
                    console.log(`[Screen_Webcam] Đã setTarget đến agent: ${agentId}`);
                } else {
                    // Nếu agents list chưa có, đợi thêm
                    setTimeout(checkAndSetTarget, 500);
                }
            } else {
                setTimeout(checkAndSetTarget, 500);
            }
        };
        setTimeout(checkAndSetTarget, 1000);
    }
}

// Initialize agent target when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentTarget);
} else {
    initAgentTarget();
}

// ===============================================
// 1. LOGIC CHỌN THƯ MỤC
// ===============================================

function triggerSelectFolder() {
    const hiddenInput = document.getElementById('hidden-folder-input');
    hiddenInput.click();
}

function onFolderSelected(input) {
    if (input.files && input.files.length > 0) {

        const relativePath = input.files[0].webkitRelativePath;
        
        const folderName = relativePath.split('/')[0];

        const folderLabel = document.getElementById('display-folder-path');
        
        folderLabel.innerText = `D:/User/Projects/${folderName}/`;
        
        input.value = ''; 
    }
}

// ===============================================
// 2. LOGIC LƯU FILE (NÚT SAVE TO DEVICE)
// ===============================================

function handleSaveAction() {
    const cameraFeed = document.getElementById('camera-feed');
    const img = cameraFeed.querySelector('img');
    const video = cameraFeed.querySelector('video');
    
    if (!img && !video) {
        alert('No preview available to save');
        return;
    }

    const folderPath = document.getElementById('display-folder-path').innerText;
    let fileName = document.getElementById('input-file-name').value;
    
    if (!fileName || fileName.trim() === "") {
        fileName = img ? "capture_default.png" : "capture_default.mp4";
        document.getElementById('input-file-name').value = fileName;
    }

    const fullPath = folderPath + fileName;

    if (img) {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = fileName;
        link.click();
    } else if (video) {
        const link = document.createElement('a');
        link.href = video.src;
        link.download = fileName;
        link.click();
    }

    console.log("Saving to:", fullPath);
}

// ===============================================
// 3. PREVIEW DISPLAY FUNCTIONS
// ===============================================

function displayImagePreview(base64Data) {
    stopProcessing(); // Stop loading when data received
    
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;

    // Remove loading indicator and placeholder
    hideLoadingIndicator();
    const placeholder = cameraFeed.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    // Remove existing video if any
    const existingVideo = cameraFeed.querySelector('video');
    if (existingVideo) existingVideo.remove();

    // Remove existing image if any
    const existingImg = cameraFeed.querySelector('img');
    if (existingImg) {
        existingImg.src = "data:image/jpeg;base64," + base64Data;
        existingImg.onload = () => {
            if (window.ui && window.ui.log) {
                window.ui.log('Screen/Webcam', 'Ảnh đã được tải thành công');
            }
        };
        existingImg.onerror = () => {
            showError('Không thể hiển thị ảnh. Dữ liệu có thể bị lỗi.');
        };
        return;
    }

    // Create new image element
    const img = document.createElement('img');
    img.src = "data:image/jpeg;base64," + base64Data;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.onload = () => {
        if (window.ui && window.ui.log) {
            window.ui.log('Screen/Webcam', 'Ảnh đã được tải thành công');
        }
    };
    img.onerror = () => {
        showError('Không thể hiển thị ảnh. Dữ liệu có thể bị lỗi.');
    };
    cameraFeed.appendChild(img);
}

function displayVideoPreview(base64Data) {
    stopProcessing(); // Stop loading when data received
    
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;

    // Remove loading indicator and placeholder
    hideLoadingIndicator();
    const placeholder = cameraFeed.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    // Remove existing image if any
    const existingImg = cameraFeed.querySelector('img');
    if (existingImg) existingImg.remove();

    // Remove existing video if any
    const existingVideo = cameraFeed.querySelector('video');
    if (existingVideo) {
        existingVideo.src = "data:video/mp4;base64," + base64Data;
        existingVideo.load();
        existingVideo.onloadeddata = () => {
            if (window.ui && window.ui.log) {
                window.ui.log('Screen/Webcam', 'Video đã được tải thành công');
            }
        };
        existingVideo.onerror = () => {
            showError('Không thể phát video. Dữ liệu có thể bị lỗi.');
        };
        return;
    }

    // Create new video element
    const video = document.createElement('video');
    video.src = "data:video/mp4;base64," + base64Data;
    video.controls = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.autoplay = true;
    video.onloadeddata = () => {
        if (window.ui && window.ui.log) {
            window.ui.log('Screen/Webcam', 'Video đã được tải thành công');
        }
    };
    video.onerror = () => {
        showError('Không thể phát video. Dữ liệu có thể bị lỗi.');
    };
    cameraFeed.appendChild(video);
}

function clearPreview() {
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;

    const img = cameraFeed.querySelector('img');
    const video = cameraFeed.querySelector('video');
    const loadingIndicator = cameraFeed.querySelector('.loading-indicator');
    
    if (img) img.remove();
    if (video) video.remove();
    if (loadingIndicator) loadingIndicator.remove();

    // Restore placeholder
    if (!cameraFeed.querySelector('.placeholder-text')) {
        const placeholder = document.createElement('span');
        placeholder.className = 'placeholder-text';
        placeholder.textContent = 'this is a preview';
        cameraFeed.appendChild(placeholder);
    }
}

function showLoadingIndicator(message = 'Đang xử lý...') {
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;

    // Remove existing loading indicator
    const existingLoader = cameraFeed.querySelector('.loading-indicator');
    if (existingLoader) existingLoader.remove();

    // Remove placeholder
    const placeholder = cameraFeed.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    // Create loading indicator
    const loader = document.createElement('div');
    loader.className = 'loading-indicator';
    loader.innerHTML = `
        <div class="spinner"></div>
        <p class="loading-text">${message}</p>
    `;
    loader.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--text-dark);
    `;
    cameraFeed.appendChild(loader);
}

function hideLoadingIndicator() {
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;
    
    const loader = cameraFeed.querySelector('.loading-indicator');
    if (loader) loader.remove();
}

function setButtonsEnabled(enabled) {
    const buttons = document.querySelectorAll('.action-capture, .action-save');
    buttons.forEach(btn => {
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.6';
        btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
}

function showError(message) {
    screenWebcamState.lastError = message;
    if (window.ui && window.ui.error) {
        window.ui.error('Screen/Webcam', message);
    } else {
        alert('Lỗi: ' + message);
    }
    
    // Show error in preview
    const cameraFeed = document.getElementById('camera-feed');
    if (cameraFeed) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <p style="color: #ff4444; font-weight: 600; margin: 10px 0;">⚠️ ${message}</p>
        `;
        errorDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            padding: 20px;
            text-align: center;
        `;
        clearPreview();
        cameraFeed.appendChild(errorDiv);
        
        // Auto remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
                clearPreview();
            }
        }, 5000);
    }
}

function startProcessing(operation) {
    screenWebcamState.isProcessing = true;
    screenWebcamState.currentOperation = operation;
    setButtonsEnabled(false);
    showLoadingIndicator(`Đang ${operation}...`);
    
    // Set timeout
    if (screenWebcamState.timeoutId) {
        clearTimeout(screenWebcamState.timeoutId);
    }
    
    screenWebcamState.timeoutId = setTimeout(() => {
        if (screenWebcamState.isProcessing) {
            stopProcessing();
            showError(`Timeout: Không nhận được phản hồi sau ${screenWebcamState.requestTimeout / 1000} giây`);
        }
    }, screenWebcamState.requestTimeout);
}

function stopProcessing() {
    screenWebcamState.isProcessing = false;
    screenWebcamState.currentOperation = null;
    setButtonsEnabled(true);
    hideLoadingIndicator();
    
    if (screenWebcamState.timeoutId) {
        clearTimeout(screenWebcamState.timeoutId);
        screenWebcamState.timeoutId = null;
    }
}

// ===============================================
// 4. BUTTON HANDLERS - SEND COMMANDS
// ===============================================

function handleScreenshot() {
    // Check if already processing
    if (screenWebcamState.isProcessing) {
        if (window.ui && window.ui.warn) {
            window.ui.warn('Screen/Webcam', 'Đang xử lý yêu cầu trước đó, vui lòng đợi...');
        }
        return;
    }

    // Check connection
    if (!window.gateway || !window.gateway.isAuthenticated) {
        showError('Chưa kết nối tới Gateway hoặc chưa đăng nhập!');
        return;
    }

    console.log('[Screen_Webcam] Gửi lệnh Screenshot...');
    
    // Update file name to image format
    const fileNameInput = document.getElementById('input-file-name');
    if (fileNameInput && !fileNameInput.value.endsWith('.png') && !fileNameInput.value.endsWith('.jpg')) {
        fileNameInput.value = 'screenshot_' + Date.now() + '.png';
    }

    // Clear previous preview and start processing
    clearPreview();
    startProcessing('chụp màn hình');

    // Send command
    try {
        const cmd = window.CONFIG ? window.CONFIG.CMD.SCREENSHOT : 'SCRSHOT';
        window.gateway.send(cmd, '');
    } catch (error) {
        stopProcessing();
        showError('Lỗi khi gửi lệnh: ' + error.message);
        console.error('[Screen_Webcam] Error sending screenshot command:', error);
    }
}

function handleCameraShot() {
    // Check if already processing
    if (screenWebcamState.isProcessing) {
        if (window.ui && window.ui.warn) {
            window.ui.warn('Screen/Webcam', 'Đang xử lý yêu cầu trước đó, vui lòng đợi...');
        }
        return;
    }

    // Check connection
    if (!window.gateway || !window.gateway.isAuthenticated) {
        showError('Chưa kết nối tới Gateway hoặc chưa đăng nhập!');
        return;
    }

    console.log('[Screen_Webcam] Gửi lệnh Camera Shot...');
    
    // Update file name to image format
    const fileNameInput = document.getElementById('input-file-name');
    if (fileNameInput && !fileNameInput.value.endsWith('.png') && !fileNameInput.value.endsWith('.jpg')) {
        fileNameInput.value = 'camshot_' + Date.now() + '.png';
    }

    // Clear previous preview and start processing
    clearPreview();
    startProcessing('chụp ảnh webcam');

    // Send command
    try {
        const cmd = window.CONFIG ? window.CONFIG.CMD.CAMSHOT : 'CAMSHOT';
        window.gateway.send(cmd, '');
    } catch (error) {
        stopProcessing();
        showError('Lỗi khi gửi lệnh: ' + error.message);
        console.error('[Screen_Webcam] Error sending camera shot command:', error);
    }
}

function handleScreenRecord() {
    // Check if already processing
    if (screenWebcamState.isProcessing) {
        if (window.ui && window.ui.warn) {
            window.ui.warn('Screen/Webcam', 'Đang xử lý yêu cầu trước đó, vui lòng đợi...');
        }
        return;
    }

    // Check connection
    if (!window.gateway || !window.gateway.isAuthenticated) {
        showError('Chưa kết nối tới Gateway hoặc chưa đăng nhập!');
        return;
    }

    // Validate and get duration
    const durationInput = document.getElementById('duration-input');
    let duration = 5;
    
    if (durationInput) {
        duration = parseInt(durationInput.value, 10);
        if (isNaN(duration) || duration < 1) {
            showError('Thời lượng không hợp lệ! Vui lòng nhập số từ 1-15 giây.');
            durationInput.focus();
            return;
        }
        if (duration > 15) {
            showError('Thời lượng tối đa là 15 giây!');
            durationInput.value = 15;
            duration = 15;
        }
    }

    console.log(`[Screen_Webcam] Gửi lệnh Screen Record với duration: ${duration} giây...`);
    
    // Update file name to video format
    const fileNameInput = document.getElementById('input-file-name');
    if (fileNameInput && !fileNameInput.value.endsWith('.mp4')) {
        fileNameInput.value = 'screen_record_' + Date.now() + '.mp4';
    }

    // Clear previous preview and start processing
    clearPreview();
    startProcessing(`ghi màn hình (${duration}s)`);

    // Send command with duration
    try {
        const cmd = window.CONFIG ? window.CONFIG.CMD.SCR_RECORD : 'SCR_RECORD';
        window.gateway.send(cmd, String(duration));
    } catch (error) {
        stopProcessing();
        showError('Lỗi khi gửi lệnh: ' + error.message);
        console.error('[Screen_Webcam] Error sending screen record command:', error);
    }
}

function handleCameraRecord() {
    // Check if already processing
    if (screenWebcamState.isProcessing) {
        if (window.ui && window.ui.warn) {
            window.ui.warn('Screen/Webcam', 'Đang xử lý yêu cầu trước đó, vui lòng đợi...');
        }
        return;
    }

    // Check connection
    if (!window.gateway || !window.gateway.isAuthenticated) {
        showError('Chưa kết nối tới Gateway hoặc chưa đăng nhập!');
        return;
    }

    // Validate and get duration
    const durationInput = document.getElementById('duration-input');
    let duration = 5;
    
    if (durationInput) {
        duration = parseInt(durationInput.value, 10);
        if (isNaN(duration) || duration < 1) {
            showError('Thời lượng không hợp lệ! Vui lòng nhập số từ 1-15 giây.');
            durationInput.focus();
            return;
        }
        if (duration > 15) {
            showError('Thời lượng tối đa là 15 giây!');
            durationInput.value = 15;
            duration = 15;
        }
    }

    console.log(`[Screen_Webcam] Gửi lệnh Camera Record với duration: ${duration} giây...`);
    
    // Update file name to video format
    const fileNameInput = document.getElementById('input-file-name');
    if (fileNameInput && !fileNameInput.value.endsWith('.mp4')) {
        fileNameInput.value = 'cam_record_' + Date.now() + '.mp4';
    }

    // Clear previous preview and start processing
    clearPreview();
    startProcessing(`ghi video webcam (${duration}s)`);

    // Send command with duration
    try {
        const cmd = window.CONFIG ? window.CONFIG.CMD.CAM_RECORD : 'cam_record';
        window.gateway.send(cmd, String(duration));
    } catch (error) {
        stopProcessing();
        showError('Lỗi khi gửi lệnh: ' + error.message);
        console.error('[Screen_Webcam] Error sending camera record command:', error);
    }
}

// ===============================================
// 5. ERROR HANDLING - Handle failed responses
// ===============================================

function handleCaptureError(errorMessage) {
    stopProcessing();
    showError(errorMessage || 'Có lỗi xảy ra khi thực hiện yêu cầu');
}

// Export functions for use in main.js
window.displayImagePreview = displayImagePreview;
window.displayVideoPreview = displayVideoPreview;
window.clearPreview = clearPreview;
window.handleScreenshot = handleScreenshot;
window.handleCameraShot = handleCameraShot;
window.handleScreenRecord = handleScreenRecord;
window.handleCameraRecord = handleCameraRecord;
window.handleCaptureError = handleCaptureError;
window.screenWebcamState = screenWebcamState;