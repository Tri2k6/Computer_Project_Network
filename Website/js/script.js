document.addEventListener('DOMContentLoaded', function() {
    
    // Xử lý nút Broadcast Mode Toggle
    const toggle = document.getElementById('toggle');
    if (toggle) {
        toggle.addEventListener('change', function() {
            if(this.checked) {
                console.log("Broadcast Mode: ON - Ready to send to all targets");
            } else {
                console.log("Broadcast Mode: OFF");
            }
        });
    }

    // (Tùy chọn) Thêm xử lý cho nút SEND để test
    const sendButton = document.querySelector('button i.fa-paper-plane')?.parentElement;
    const commandInput = document.querySelector('input[placeholder^="Enter command"]');

    if (sendButton && commandInput) {
        sendButton.addEventListener('click', function() {
            const cmd = commandInput.value;
            if (cmd.trim() !== "") {
                console.log(`Executing command: ${cmd}`);
                alert(`Command sent: ${cmd}`); // Hiển thị thông báo test
                commandInput.value = ""; // Xóa ô nhập sau khi gửi
            }
        });
    }
});