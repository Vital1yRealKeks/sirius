document.addEventListener('DOMContentLoaded', function() {
    // Функция для получения CSRF-токена
    const getCSRFToken = () => {
        return document.querySelector('meta[name="csrf-token"]').content;
    };

    // Элементы форм
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');

    // Переключение между формами
    const toggleForms = (showLoginForm) => {
        loginForm.style.display = showLoginForm ? 'block' : 'none';
        registerForm.style.display = showLoginForm ? 'none' : 'block';
    };

    // Обработчики переключения
    showRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms(false);
    });

    showLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms(true);
    });

    // Обработчик формы входа
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(loginForm);
        formData.append('csrf_token', getCSRFToken());

        try {
            const response = await fetch(loginForm.action, {
                method: 'POST',
                body: formData
            });

            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const data = await response.json();
                if (data.error) {
                    alert(data.error);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Ошибка соединения');
        }
    });

    // Обработчик формы регистрации
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(registerForm);
        formData.append('csrf_token', getCSRFToken());

        try {
            const response = await fetch(registerForm.action, {
                method: 'POST',
                body: formData
            });

            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const data = await response.json();
                if (data.error) {
                    alert(data.error);
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Ошибка соединения');
        }
    });

    // Инициализация
    toggleForms(true);
});