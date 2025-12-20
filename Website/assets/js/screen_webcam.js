import * as Logic from './logic.js';

// Lấy tham số từ URL
// Xử lý trường hợp URL có nhiều query string (ví dụ: ?mode=screen?id=CONN-1)
let searchString = window.location.search;
// Nếu có nhiều dấu ?, chỉ lấy phần đầu tiên
if (searchString.split('?').length > 2) {
    // Tách URL và chỉ lấy phần query string đầu tiên
    const urlParts = window.location.href.split('?');
    if (urlParts.length > 1) {
        // Lấy phần query string đầu tiên (sau dấu ? đầu tiên)
        searchString = '?' + urlParts[1];
    }
}

const urlParams = new URLSearchParams(searchString);
let mode = urlParams.get('mode'); // "screen" hoặc "webcam"

// Nếu mode vẫn không hợp lệ, thử parse từ URL trực tiếp
if (!mode || (mode !== 'screen' && mode !== 'webcam')) {
    // Thử tìm mode trong URL bằng regex
    const modeMatch = window.location.href.match(/[?&]mode=([^&?]+)/);
    if (modeMatch && modeMatch[1]) {
        mode = modeMatch[1].split('?')[0].split('&')[0]; // Lấy phần đầu, bỏ qua các tham số sau
    }
}

// Log để debug
console.log('[Screen_Webcam] Mode:', mode);
console.log('[Screen_Webcam] URL:', window.location.href);
console.log('[Screen_Webcam] Search:', searchString);
// Biến lưu directory handle đã chọn
let selectedDirectoryHandle = null;
let selectedDirectoryName = null; // Lưu tên thư mục để hiển thị


// ===============================================
// 1. LOGIC CHỌN THƯ MỤC
// ===============================================

async function triggerSelectFolder() {
    if ('showDirectoryPicker' in window) {
        try {
            selectedDirectoryHandle = await window.showDirectoryPicker();
            selectedDirectoryName = selectedDirectoryHandle.name;
            
            const folderLabel = document.getElementById('display-folder-path');
            folderLabel.innerText = selectedDirectoryName + '/';
            folderLabel.style.color = 'var(--text-orange)';
            
            console.log('Directory selected:', selectedDirectoryName);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting directory:', error);
                alert('Lỗi khi chọn thư mục: ' + error.message);
            }
        }
    } else {
        alert('Trình duyệt không hỗ trợ chọn thư mục. Vui lòng sử dụng Chrome, Edge hoặc trình duyệt Chromium khác.');
    }
}

// ===============================================
// 2. LOGIC LƯU FILE (NÚT SAVE TO DEVICE)
// ===============================================

async function handleSaveAction() {
    const cameraFeed = document.getElementById('camera-feed');
    const img = cameraFeed.querySelector('img');
    const video = cameraFeed.querySelector('video');
    
    if (!img && !video) {
        alert('No preview available to save');
        return;
    }

    let fileName = document.getElementById('input-file-name').value;
    
    if (!fileName || fileName.trim() === "") {
        fileName = img ? "capture_default.png" : "capture_default.mp4";
        document.getElementById('input-file-name').value = fileName;
    }

    // Kiểm tra xem File System Access API có khả dụng không
    if ('showDirectoryPicker' in window) {
        // Kiểm tra xem đã chọn thư mục chưa
        if (!selectedDirectoryHandle) {
            alert('Vui lòng chọn thư mục lưu file trước (nhấn vào đường dẫn ở góc dưới)');
            return;
        }

        try {
            // Lấy dữ liệu từ img hoặc video
            let blob;
            if (img) {
                // Chuyển đổi base64 image sang blob
                const response = await fetch(img.src);
                blob = await response.blob();
            } else if (video) {
                // Chuyển đổi base64 video sang blob
                const response = await fetch(video.src);
                blob = await response.blob();
            }

            // Tạo file trong thư mục đã chọn
            const fileHandle = await selectedDirectoryHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            // Cập nhật hiển thị (giữ nguyên tên thư mục đã chọn)
            const folderLabel = document.getElementById('display-folder-path');
            if (selectedDirectoryName) {
                folderLabel.innerText = selectedDirectoryName + '/';
                folderLabel.style.color = 'var(--text-blue)';
            }

            console.log("File saved successfully to:", fileName);
            alert('Đã lưu file: ' + fileName);
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Lỗi khi lưu file: ' + error.message);
        }
    } else {
        // Fallback: Sử dụng phương thức download truyền thống
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

        console.log("File downloaded (fallback method)");
        alert('Trình duyệt không hỗ trợ chọn thư mục. File sẽ được lưu vào thư mục Downloads mặc định.');
    }
}

// Debounce và timeout tracking cho capture
let lastCaptureTime = 0;
const CAPTURE_DEBOUNCE_MS = 2000; // 2 giây debounce
let captureTimeoutId = null;
let isWaitingForCapture = false;

function capture() {
    try {
        // Debounce: Tránh spam requests
        const now = Date.now();
        if (now - lastCaptureTime < CAPTURE_DEBOUNCE_MS) {
            const remaining = Math.ceil((CAPTURE_DEBOUNCE_MS - (now - lastCaptureTime)) / 1000);
            alert(`Vui lòng đợi ${remaining} giây trước khi capture lại.`);
            return;
        }

        // Kiểm tra connection
        if (!window.gateway || !window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
            alert('Chưa kết nối đến Gateway. Vui lòng kiểm tra kết nối.');
            return;
        }

        if (!window.gateway.isAuthenticated) {
            alert('Chưa đăng nhập. Vui lòng đợi kết nối hoàn tất.');
            return;
        }

        if (!mode) {
            console.error('[Capture] Mode không được xác định');
            alert('Mode không hợp lệ. Vui lòng kiểm tra URL (cần có ?mode=screen hoặc ?mode=webcam)');
            return;
        }

        // Clear timeout cũ nếu có
        if (captureTimeoutId) {
            clearTimeout(captureTimeoutId);
        }

        // Set flag đang chờ response
        isWaitingForCapture = true;
        lastCaptureTime = now;

        let success = false;
        if (mode === 'screen') {
            console.log('[Capture] Sending SCREENSHOT command');
            success = Logic.captureScreen();
            document.getElementById('input-file-name').value = 'screenshot_' + Date.now() + '.png';
        } else if (mode === 'webcam') {
            console.log('[Capture] Sending CAMSHOT command');
            success = Logic.captureWebcam();
            document.getElementById('input-file-name').value = 'webcam_' + Date.now() + '.png';
        } else {
            console.error('[Capture] Mode không hợp lệ:', mode);
            alert('Mode không hợp lệ: ' + mode);
            isWaitingForCapture = false;
            return;
        }

        if (!success) {
            isWaitingForCapture = false;
            alert('Không thể thực hiện capture. Vui lòng kiểm tra kết nối.');
            return;
        }

        // Timeout: Nếu sau 10 giây không nhận được response, báo lỗi
        captureTimeoutId = setTimeout(() => {
            if (isWaitingForCapture) {
                isWaitingForCapture = false;
                console.warn('[Capture] Timeout: Không nhận được response sau 10 giây');
                
                // Kiểm tra connection
                if (!window.gateway || !window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
                    handleCaptureError('Kết nối bị đứt. Vui lòng thử lại sau khi kết nối lại.');
                } else {
                    handleCaptureError('Không nhận được dữ liệu từ agent. Có thể agent đã crash hoặc không thể capture màn hình.');
                }
            }
        }, 10000); // 10 giây timeout

    } catch (error) {
        isWaitingForCapture = false;
        if (captureTimeoutId) {
            clearTimeout(captureTimeoutId);
        }
        console.error('[Capture] Error:', error);
        alert('Lỗi khi capture: ' + error.message);
    }
}

// Expose functions to window object ngay sau khi định nghĩa để đảm bảo có thể truy cập từ HTML
// Đặt ở đây để đảm bảo các function đã được định nghĩa trước khi expose

// Function record() - chỉ được gọi khi nhấn nút "Record"
// Input duration chỉ để chỉnh thời gian, không gửi lệnh khi thay đổi
function record() {
    try {
        // Kiểm tra mode
        if (!mode) {
            console.error('[Record] Mode không được xác định');
            alert('Mode không hợp lệ. Vui lòng kiểm tra URL (cần có ?mode=screen hoặc ?mode=webcam)');
            return;
        }

        // Lấy phần tử input có class 'duration-input'
        // Lưu ý: Input này chỉ để nhập thời gian, không có event listener nào
        // Lệnh chỉ được gửi khi nhấn nút "Record" (gọi hàm này)
        const durationInput = document.querySelector('.duration-input');
        if (!durationInput) {
            console.error('[Record] Không tìm thấy duration-input');
            alert('Không tìm thấy input thời gian');
            return;
        }

        // Lấy giá trị hiện tại từ input (chỉ đọc giá trị, không gửi lệnh)
        const value = durationInput.value;

        // Chuyển đổi sang số và kiểm tra hợp lệ
        const duration = parseInt(value, 10);
        if (isNaN(duration) || duration < 1) {
            alert('Vui lòng nhập thời gian hợp lệ (>= 1 giây)');
            return;
        }

        // Giới hạn thời gian tối đa 15 giây (theo server)
        const finalDuration = Math.min(duration, 15);

        let success = false;
        if (mode === 'screen') {
            // Gửi lệnh quay màn hình với thời gian
            console.log('[Record] Sending SCR_RECORD command with duration:', finalDuration);
            success = Logic.recordScreen(finalDuration);
            // Cập nhật tên file mặc định cho video
            document.getElementById('input-file-name').value = 'screen_record_' + Date.now() + '.mp4';
        } else if (mode === 'webcam') {
            // Gửi lệnh quay webcam với thời gian
            console.log('[Record] Sending CAM_RECORD command with duration:', finalDuration);
            success = Logic.recordWebcam(finalDuration);
            // Cập nhật tên file mặc định cho video
            document.getElementById('input-file-name').value = 'webcam_record_' + Date.now() + '.mp4';
        } else {
            console.error('[Record] Mode không hợp lệ:', mode);
            alert('Mode không hợp lệ: ' + mode);
            return;
        }

        if (!success) {
            alert('Không thể thực hiện record. Vui lòng kiểm tra kết nối.');
        }
    } catch (error) {
        console.error('[Record] Error:', error);
        alert('Lỗi khi record: ' + error.message);
    }
}

window.displayImagePreview = function(base64Data) {
    // Clear timeout vì đã nhận được response
    if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
        captureTimeoutId = null;
    }
    isWaitingForCapture = false;

    const cameraFeed = document.getElementById('camera-feed');
    
    if (!cameraFeed) {
        console.error('Không tìm thấy camera-feed element');
        return;
    }

    // Validate base64 data
    if (!base64Data || base64Data.trim() === '') {
        console.error('[Display] Base64 data rỗng');
        handleCaptureError('Không nhận được dữ liệu ảnh từ server');
        return;
    }

    const placeholder = cameraFeed.querySelector('.placeholder-text');
    if (placeholder) {
        placeholder.remove();
    }

    const existingVideo = cameraFeed.querySelector('video');
    if (existingVideo) {
        existingVideo.remove();
    }

    // Xóa error message nếu có
    const errorDiv = cameraFeed.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }

    let img = cameraFeed.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        cameraFeed.appendChild(img);
    }

    try {
        img.src = "data:image/jpeg;base64," + base64Data;
        img.alt = mode === 'screen' ? 'Screen Capture' : 'Webcam Capture';
        
        // Xử lý lỗi load image
        img.onerror = () => {
            console.error('[Display] Lỗi load image từ base64');
            handleCaptureError('Không thể hiển thị ảnh. Dữ liệu có thể bị hỏng.');
        };
        
        img.onload = () => {
            console.log('[Display] Image loaded successfully');
        };
    } catch (error) {
        console.error('[Display] Error setting image src:', error);
        handleCaptureError('Lỗi khi hiển thị ảnh: ' + error.message);
    }
};

window.displayVideoPreview = function(base64Data) {
    // Clear timeout vì đã nhận được response
    if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
        captureTimeoutId = null;
    }
    isWaitingForCapture = false;

    const cameraFeed = document.getElementById('camera-feed');
    
    if (!cameraFeed) {
        console.error('Không tìm thấy camera-feed element');
        return;
    }

    // Validate base64 data
    if (!base64Data || base64Data.trim() === '') {
        console.error('[Display] Base64 video data rỗng');
        handleCaptureError('Không nhận được dữ liệu video từ server');
        return;
    }

    const placeholder = cameraFeed.querySelector('.placeholder-text');
    if (placeholder) {
        placeholder.remove();
    }

    const existingImg = cameraFeed.querySelector('img');
    if (existingImg) {
        existingImg.remove();
    }

    // Xóa error message nếu có
    const errorDiv = cameraFeed.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }

    let video = cameraFeed.querySelector('video');
    if (!video) {
        video = document.createElement('video');
        video.controls = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '100%';
        video.style.objectFit = 'contain';
        cameraFeed.appendChild(video);
    }

    try {
        video.src = "data:video/mp4;base64," + base64Data;
        
        // Xử lý lỗi load video
        video.onerror = () => {
            console.error('[Display] Lỗi load video từ base64');
            handleCaptureError('Không thể hiển thị video. Dữ liệu có thể bị hỏng.');
        };
        
        video.onloadeddata = () => {
            console.log('[Display] Video loaded successfully');
        };
        
        video.load();
    } catch (error) {
        console.error('[Display] Error setting video src:', error);
        handleCaptureError('Lỗi khi hiển thị video: ' + error.message);
    }
};

// Xử lý lỗi khi capture/record
window.handleCaptureError = function(errorMessage) {
    // Clear timeout và flag
    if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
        captureTimeoutId = null;
    }
    isWaitingForCapture = false;

    console.error('[Capture Error]', errorMessage);
    
    // Xóa placeholder và hiển thị thông báo lỗi trong preview area
    const cameraFeed = document.getElementById('camera-feed');
    if (cameraFeed) {
        // Xóa các element preview cũ
        const existingImg = cameraFeed.querySelector('img');
        const existingVideo = cameraFeed.querySelector('video');
        if (existingImg) existingImg.remove();
        if (existingVideo) existingVideo.remove();
        
        // Kiểm tra xem đã có error message chưa
        let errorDiv = cameraFeed.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #ef4444;
                background-color: #fee2e2;
                border: 2px solid #ef4444;
                border-radius: 8px;
                margin: 20px;
                font-family: 'Inter', sans-serif;
            `;
            cameraFeed.appendChild(errorDiv);
        }
        
        // Dịch thông báo lỗi sang tiếng Việt nếu cần
        let friendlyMessage = errorMessage;
        
        // Kiểm tra lỗi connection
        if (errorMessage.includes('Broken pipe') || errorMessage.includes('Connection error') || errorMessage.includes('kết nối bị đứt')) {
            friendlyMessage = '❌ Lỗi kết nối\n\n' +
                            'Kết nối đến agent bị đứt trong khi capture.\n\n' +
                            'Nguyên nhân có thể:\n' +
                            '1. Agent bị crash khi chụp màn hình\n' +
                            '2. Mất kết nối mạng\n' +
                            '3. Gateway đã ngắt kết nối\n\n' +
                            'Giải pháp:\n' +
                            '- Đợi vài giây để kết nối tự động khôi phục\n' +
                            '- Thử lại sau khi thấy "Đã kết nối" trong console\n' +
                            '- Kiểm tra agent có đang chạy không';
        } else if (errorMessage.includes('hard exiting') || errorMessage.includes('system signals')) {
            friendlyMessage = '❌ Agent bị crash\n\n' +
                            'Agent đã bị crash khi thực hiện capture.\n\n' +
                            'Nguyên nhân có thể:\n' +
                            '1. Ffmpeg không tương thích kiến trúc CPU\n' +
                            '2. Lỗi quyền truy cập màn hình/webcam\n' +
                            '3. Lỗi bộ nhớ hoặc tài nguyên hệ thống\n\n' +
                            'Giải pháp:\n' +
                            '- Kiểm tra và cài lại ffmpeg đúng kiến trúc:\n' +
                            '  rm ~/.local/bin/ffmpeg\n' +
                            '  brew install ffmpeg\n' +
                            '- Khởi động lại agent\n' +
                            '- Kiểm tra quyền truy cập màn hình/webcam';
        } else if (errorMessage.includes('cannot execute binary file') || errorMessage.includes('cannot execute binary')) {
            friendlyMessage = '❌ Lỗi: Ffmpeg không tương thích với kiến trúc CPU\n\n' +
                            'Nguyên nhân: File ffmpeg được biên dịch cho kiến trúc CPU khác (x86_64 vs ARM64)\n\n' +
                            'Giải pháp:\n' +
                            '1. Xóa ffmpeg cũ:\n' +
                            '   rm ~/.local/bin/ffmpeg\n\n' +
                            '2. Cài đặt lại ffmpeg đúng kiến trúc:\n' +
                            '   - Với Apple Silicon (M1/M2/M3): brew install ffmpeg\n' +
                            '   - Hoặc tải từ: https://evermeet.cx/ffmpeg/\n\n' +
                            '3. Kiểm tra kiến trúc hệ thống:\n' +
                            '   uname -m  (phải là arm64 cho Apple Silicon)';
        } else if (errorMessage.includes('Ffmpeg chay xong nhung khong co du lieu anh')) {
            // Lỗi này có thể do ffmpeg không tương thích kiến trúc CPU
            friendlyMessage = 'Lỗi: Ffmpeg không thể tạo dữ liệu ảnh\n\n' +
                            'Nguyên nhân có thể:\n' +
                            '1. Ffmpeg không tương thích với kiến trúc CPU (x86_64 vs ARM64)\n' +
                            '   → Giải pháp: Xóa ffmpeg cũ và cài lại đúng kiến trúc:\n' +
                            '      rm ~/.local/bin/ffmpeg\n' +
                            '      brew install ffmpeg\n\n' +
                            '2. Màn hình không có nội dung\n' +
                            '3. Lỗi quyền truy cập màn hình\n' +
                            '4. Lỗi cấu hình Ffmpeg';
        } else if (errorMessage.includes('Ffmpeg') || errorMessage.includes('ffmpeg')) {
            friendlyMessage = 'Lỗi: ' + errorMessage + '\n\nVui lòng kiểm tra:\n- Ffmpeg đã được cài đặt đúng chưa\n- Quyền truy cập màn hình/webcam\n- Kiến trúc CPU có tương thích không (x86_64 vs ARM64)';
        }
        
        // Escape HTML để tránh XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        errorDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">⚠️ Lỗi Capture</div>
            <div style="font-size: 13px; white-space: pre-line; line-height: 1.6; text-align: left; max-height: 400px; overflow-y: auto;">${escapeHtml(friendlyMessage)}</div>
        `;
        
        // Tự động xóa error message sau 10 giây
        setTimeout(() => {
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.remove();
                // Khôi phục placeholder nếu không có preview nào
                if (!cameraFeed.querySelector('img') && !cameraFeed.querySelector('video')) {
                    const placeholder = document.createElement('span');
                    placeholder.className = 'placeholder-text';
                    placeholder.textContent = 'this is a preview';
                    cameraFeed.appendChild(placeholder);
                }
            }
        }, 10000);
    }
    
    // Vẫn hiển thị alert để đảm bảo người dùng nhận được thông báo
    alert('❌ Lỗi Capture\n\n' + errorMessage);
};

document.addEventListener('DOMContentLoaded', () => {
    const durationInput = document.querySelector('.duration-input');
    if (durationInput) {
        durationInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        durationInput.addEventListener('change', (e) => {
            e.stopPropagation();
        });
        durationInput.addEventListener('input', (e) => {
            e.stopPropagation();
        });
    }
});

// ================== BACK TO MENU ==================
function backToMenu() {
    // Giữ lại agent ID khi quay lại menu
    const agentId = sessionStorage.getItem('current_agent_id') || 
                    new URLSearchParams(window.location.search).get('id');
    let menuUrl = './feature_menu.html';
    if (agentId) {
        menuUrl += `?id=${agentId}`;
    }
    window.location.href = menuUrl;
}

window.capture = capture;
window.record = record;
window.handleSaveAction = handleSaveAction;
window.triggerSelectFolder = triggerSelectFolder;
window.backToMenu = backToMenu;