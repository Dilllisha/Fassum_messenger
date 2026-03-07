document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. ЛОГИКА ДЛЯ СТРАНИЦЫ РЕГИСТРАЦИИ
    // =========================================
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        // Инпуты
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        
        // Элементы для вывода ошибок
        const usernameError = document.getElementById('usernameError');
        const emailError = document.getElementById('emailError');
        const passwordStrengthError = document.getElementById('passwordStrengthError');
        const passwordError = document.getElementById('passwordError');
        
        // Кнопка и анимация загрузки
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const loader = submitBtn.querySelector('.loader');

        // Регулярные выражения (правила)
        const usernameRegex = /^[a-zA-Z0-9_]{3,10}$/; 
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{6,13}$/;

        // Функция показа/скрытия ошибки
        const showError = (input, errorElement, show) => {
            if (show) {
                errorElement.style.display = 'block';
                input.style.borderColor = '#ef4444'; // Красная рамка
            } else {
                errorElement.style.display = 'none';
                input.style.borderColor = 'rgba(255, 255, 255, 0.1)'; // Обычная рамка
            }
        };

        // Функции валидации каждого поля
        const validateUsername = () => {
            const isValid = usernameRegex.test(usernameInput.value);
            showError(usernameInput, usernameError, !isValid);
            return isValid;
        };

        const validateEmail = () => {
            const isValid = emailRegex.test(emailInput.value);
            showError(emailInput, emailError, !isValid);
            return isValid;
        };

        const validatePasswordStrength = () => {
            const isValid = passwordRegex.test(passwordInput.value);
            showError(passwordInput, passwordStrengthError, !isValid);
            return isValid;
        };

        const checkPasswordsMatch = () => {
            if (confirmPasswordInput.value === '') return false;
            const isMatch = passwordInput.value === confirmPasswordInput.value;
            showError(confirmPasswordInput, passwordError, !isMatch);
            return isMatch;
        };

        // ПРОВЕРКА В РЕАЛЬНОМ ВРЕМЕНИ (При вводе текста)
        usernameInput.addEventListener('input', validateUsername);
        emailInput.addEventListener('input', validateEmail);
        
        passwordInput.addEventListener('input', () => {
            validatePasswordStrength();
            if (confirmPasswordInput.value !== '') {
                checkPasswordsMatch();
            }
        });
        
        confirmPasswordInput.addEventListener('input', checkPasswordsMatch);

        // ОТПРАВКА ФОРМЫ РЕГИСТРАЦИИ
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Останавливаем перезагрузку страницы

            // Принудительно проверяем все поля
            const isUsernameValid = validateUsername();
            const isEmailValid = validateEmail();
            const isPasswordStrong = validatePasswordStrength();
            const isPasswordsMatch = checkPasswordsMatch();

            // Если есть ошибка — трясем форму
            if (!isUsernameValid || !isEmailValid || !isPasswordStrong || !isPasswordsMatch) {
                registerForm.style.transform = 'translateX(10px)';
                setTimeout(() => registerForm.style.transform = 'translateX(-10px)', 100);
                setTimeout(() => registerForm.style.transform = 'translateX(0)', 200);
                return;
            }

            // Включаем лоадер
            btnText.style.display = 'none';
            loader.style.display = 'block';
            submitBtn.disabled = true;

            // Переход в мессенджер через 1.5 секунды
            setTimeout(() => {
                console.log('Данные валидны. Аккаунт создан!');
                window.location.href = 'messenger.html'; 
            }, 1500);
        });
    }

    // =========================================
    // 2. ЛОГИКА ДЛЯ СТРАНИЦЫ ВХОДА (LOGIN)
    // =========================================
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        const loginEmailInput = document.getElementById('loginEmail');
        const loginPasswordInput = document.getElementById('loginPassword');
        const loginSubmitBtn = document.getElementById('loginSubmitBtn');
        const loginBtnText = loginSubmitBtn.querySelector('.btn-text');
        const loginLoader = loginSubmitBtn.querySelector('.loader');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Проверка на пустые поля
            if (loginEmailInput.value.trim() === '' || loginPasswordInput.value.trim() === '') {
                loginForm.style.transform = 'translateX(10px)';
                setTimeout(() => loginForm.style.transform = 'translateX(-10px)', 100);
                setTimeout(() => loginForm.style.transform = 'translateX(0)', 200);
                return;
            }

            // Включаем лоадер
            loginBtnText.style.display = 'none';
            loginLoader.style.display = 'block';
            loginSubmitBtn.disabled = true;

            // Переход в мессенджер через 1 секунду
            setTimeout(() => {
                console.log('Вход выполнен успешно!');
                window.location.href = 'messenger.html'; 
            }, 1000);
        });
    }
    // =========================================
    // 3. ЛОГИКА ДЛЯ СТРАНИЦЫ ВОССТАНОВЛЕНИЯ ПАРОЛЯ
    // =========================================
    const forgotForm = document.getElementById('forgotForm');
    
    if (forgotForm) {
        const forgotEmailInput = document.getElementById('forgotEmail');
        const forgotEmailError = document.getElementById('forgotEmailError');
        const forgotSubmitBtn = document.getElementById('forgotSubmitBtn');
        const forgotBtnText = forgotSubmitBtn.querySelector('.btn-text');
        const forgotLoader = forgotSubmitBtn.querySelector('.loader');
        
        const successMessage = document.getElementById('successMessage');
        const emailGroup = document.getElementById('emailGroup');
        const headerDesc = document.getElementById('headerDesc');

        // Регулярное выражение для почты
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Валидация
        const validateForgotEmail = () => {
            const isValid = emailRegex.test(forgotEmailInput.value);
            if (!isValid) {
                forgotEmailError.style.display = 'block';
                forgotEmailInput.style.borderColor = '#ef4444';
            } else {
                forgotEmailError.style.display = 'none';
                forgotEmailInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
            return isValid;
        };

        // Проверка в реальном времени
        forgotEmailInput.addEventListener('input', validateForgotEmail);

        forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Если email введен неверно — трясем форму
            if (!validateForgotEmail()) {
                forgotForm.style.transform = 'translateX(10px)';
                setTimeout(() => forgotForm.style.transform = 'translateX(-10px)', 100);
                setTimeout(() => forgotForm.style.transform = 'translateX(0)', 200);
                return;
            }

            // Показываем лоадер
            forgotBtnText.style.display = 'none';
            forgotLoader.style.display = 'block';
            forgotSubmitBtn.disabled = true;

            // Имитация отправки письма на сервер (1.5 секунды)
            setTimeout(() => {
                // Прячем поле ввода, кнопку и старое описание
                emailGroup.style.display = 'none';
                forgotSubmitBtn.style.display = 'none';
                headerDesc.style.display = 'none';
                
                // Показываем зеленое сообщение об успехе
                successMessage.style.display = 'block';
            }, 1500);
        });
    }
});