tailwind.config = {
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#0f172a', // Nền chính
                    800: '#1e293b', // Sidebar / Card
                    700: '#334155', // Border
                },
                accent: {
                    purple: '#8b5cf6', // Màu tím chủ đạo
                    purpleHover: '#7c3aed',
                    blue: '#3b82f6',
                    red: '#ef4444'
                }
            },
            fontFamily: {
                mono: ['"Fira Code"', 'monospace'], // Font chữ kiểu code
            }
        }
    }
}