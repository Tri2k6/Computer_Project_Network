// Danh sách định nghĩa: ID của nút -> Chữ sẽ hiện lên màn hình
const HOVER_TEXTS = {
    'btn-restart': 'Restarting...',
    'btn-shutdown': 'Shutting Down...',
    'btn-sleep': 'Sleeping...'
};

document.addEventListener('DOMContentLoaded', () => {
    const screenTextElement = document.getElementById('screen-text');
    const buttons = document.querySelectorAll('.img-btn');
    const defaultText = "Goodbye!";

    function updateText(text) {
        screenTextElement.classList.add('fade-out');

        setTimeout(() => {
            screenTextElement.textContent = text;
            screenTextElement.classList.remove('fade-out');
        }, 250);
    }

    buttons.forEach(btn => {
        // Khi di chuột VÀO nút
        btn.addEventListener('mouseenter', () => {
            const btnId = btn.id;
            if (HOVER_TEXTS[btnId]) {
                updateText(HOVER_TEXTS[btnId]);
            }
        });

        // Khi di chuột RA KHỎI nút
        btn.addEventListener('mouseleave', () => {
            updateText(defaultText);
        });

        // Khi CLICK nút (Chưa gửi dữ liệu, chỉ log chơi hoặc làm hiệu ứng khác nếu muốn)
        btn.addEventListener('click', () => {
            console.log(`User clicked: ${btn.id}`);
            // Sau này bạn muốn gửi JSON thì viết code vào đây
        });
    });
});