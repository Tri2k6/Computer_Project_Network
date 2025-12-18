// ===============================================
// 0. HELPER: Initialize agent target
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
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;

    // Remove placeholder text
    const placeholder = cameraFeed.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    // Remove existing video if any
    const existingVideo = cameraFeed.querySelector('video');
    if (existingVideo) existingVideo.remove();

    // Remove existing image if any
    const existingImg = cameraFeed.querySelector('img');
    if (existingImg) {
        existingImg.src = "data:image/jpeg;base64," + base64Data;
        return;
    }

    // Create new image element
    const img = document.createElement('img');
    img.src = "data:image/jpeg;base64," + base64Data;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    cameraFeed.appendChild(img);
}

function displayVideoPreview(base64Data) {
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;

    // Remove placeholder text
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
    cameraFeed.appendChild(video);
}

function clearPreview() {
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;

    const img = cameraFeed.querySelector('img');
    const video = cameraFeed.querySelector('video');
    
    if (img) img.remove();
    if (video) video.remove();

    // Restore placeholder
    if (!cameraFeed.querySelector('.placeholder-text')) {
        const placeholder = document.createElement('span');
        placeholder.className = 'placeholder-text';
        placeholder.textContent = 'this is a preview';
        cameraFeed.appendChild(placeholder);
    }
}

// Export functions for use in main.js
window.displayImagePreview = displayImagePreview;
window.displayVideoPreview = displayVideoPreview;
window.clearPreview = clearPreview;