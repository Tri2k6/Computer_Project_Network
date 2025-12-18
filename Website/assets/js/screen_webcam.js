// Lấy tham số từ URL
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode'); // "screen" hoặc "webcam"

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

function capture() {
    if (mode === 'screen') {
        // Xử lý cho màn hình (Screen Control)
        alert('capture screen')
        // code cho Screen Control ở đây
    } else if (mode === 'webcam') {
        // Xử lý cho Webcam Control
        alert('capture webcam')
        // code cho Webcam Control ở đây
    }
}

function record() {
    // Lấy phần tử input có class 'duration-input'
    const durationInput = document.querySelector('.duration-input');

    // Lấy giá trị hiện tại (là chuỗi)
    const value = durationInput.value;

    if (mode === 'screen') {
        // Xử lý cho màn hình (Screen Control)
        alert('record screen for ' + value)
        // code cho Screen Control ở đây
    } else if (mode === 'webcam') {
        // Xử lý cho Webcam Control
        alert('record webcam for ' + value)
        // code cho Webcam Control ở đây
    }
}