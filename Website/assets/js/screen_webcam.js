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
    const folderPath = document.getElementById('display-folder-path').innerText;
    
    let fileName = document.getElementById('input-file-name').value;
    
    if (!fileName || fileName.trim() === "") {
        fileName = "capture_default.png";
        document.getElementById('input-file-name').value = fileName;
    }

    const fullPath = folderPath + fileName;

    console.log("Saving to:", fullPath);
    alert(`Đang tiến hành lưu file vào:\n${fullPath}`);
}