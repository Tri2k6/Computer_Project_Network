// ===============================================
// 1. LOGIC CHỌN THƯ MỤC
// ===============================================

// Hàm kích hoạt input chọn folder ẩn
function triggerSelectFolder() {
    // Tìm thẻ input ẩn
    const hiddenInput = document.getElementById('hidden-folder-input');
    // Kích hoạt sự kiện click của nó
    hiddenInput.click();
}

// Hàm xử lý khi người dùng chọn xong folder trong popup
function onFolderSelected(input) {
    // Kiểm tra xem có file nào được chọn không (nghĩa là folder có được chọn không)
    if (input.files && input.files.length > 0) {
        
        // Lấy đường dẫn của file đầu tiên bên trong folder đó
        // Ví dụ: "TaiLieuHocTap/Bai1.docx"
        const relativePath = input.files[0].webkitRelativePath;
        
        // Tách lấy phần tên thư mục gốc (TaiLieuHocTap)
        const folderName = relativePath.split('/')[0];

        // Cập nhật giao diện
        const folderLabel = document.getElementById('display-folder-path');
        
        // [QUAN TRỌNG]
        // Vì trình duyệt bảo mật, ta không lấy được "D:/...".
        // Ta giả lập đường dẫn để hiển thị cho đẹp.
        // Khi làm app C++ thật, bạn sẽ thay thế chuỗi này bằng đường dẫn thực từ C++.
        folderLabel.innerText = `D:/User/Projects/${folderName}/`;
        
        // Reset input để lần sau chọn lại folder cũ vẫn nhận sự kiện onchange
        input.value = ''; 
    }
}

// ===============================================
// 2. LOGIC LƯU FILE (NÚT SAVE TO DEVICE)
// ===============================================

function handleSaveAction() {
    // 1. Lấy phần đường dẫn folder
    const folderPath = document.getElementById('display-folder-path').innerText;
    
    // 2. Lấy tên file người dùng nhập
    let fileName = document.getElementById('input-file-name').value;
    
    // Nếu trống thì điền mặc định
    if (!fileName || fileName.trim() === "") {
        fileName = "capture_default.png";
        document.getElementById('input-file-name').value = fileName;
    }

    // 3. Ghép lại
    const fullPath = folderPath + fileName;

    // 4. Xử lý lưu (Demo)
    console.log("Saving to:", fullPath);
    alert(`Đang tiến hành lưu file vào:\n${fullPath}`);

    // [GHI CHÚ CHO C++]
    // Nếu bạn muốn lưu thật sự xuống ổ cứng người dùng:
    // Bạn cần gửi biến 'fullPath' này xuống cho code C++ xử lý ghi file.
}