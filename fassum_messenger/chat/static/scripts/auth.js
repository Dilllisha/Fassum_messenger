document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. ЛОГИКА ДЛЯ СТРАНИЦЫ РЕГИСТРАЦИИ
    // =========================================
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        // Инпуты
        const nameInput = document.getElementById('first_name'); // НОВОЕ ПОЛЕ
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        // --- ЛОГИКА АВТОГЕНЕРАЦИИ ТЕГА ---
        if (nameInput && usernameInput) {
            const translit = (str) => {
                const ru = {
                    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
                    'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i',
                    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
                    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
                    'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
                    'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
                    'э': 'e', 'ю': 'yu', 'я': 'ya', ' ': '_'
                };
                return str.toLowerCase().split('').map(char => ru[char] || char).join('').replace(/[^a-z0-9_]/g, '');
            };

            nameInput.addEventListener('input', () => {
                if (!usernameInput.dataset.manual) {
                    usernameInput.value = translit(nameInput.value);
                }
            });

            usernameInput.addEventListener('input', () => {
                usernameInput.dataset.manual = 'true';
                usernameInput.value = usernameInput.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
            });
        }
        // ----------------------------------

        const usernameError = document.getElementById('usernameError');
        const emailError = document.getElementById('emailError');
        const passwordStrengthError = document.getElementById('passwordStrengthError');
        const passwordError = document.getElementById('passwordError');

        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const loader = submitBtn.querySelector('.loader');

        const usernameRegex = /^[a-zA-Z0-9_]{3,10}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{6,13}$/;

        const showError = (input, errorElement, show) => {
            if (show) {
                errorElement.style.display = 'block';
                input.style.borderColor = '#ef4444';
            } else {
                errorElement.style.display = 'none';
                input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
        };

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

        usernameInput.addEventListener('input', validateUsername);
        emailInput.addEventListener('input', validateEmail);
        passwordInput.addEventListener('input', () => {
            validatePasswordStrength();
            if (confirmPasswordInput.value !== '') checkPasswordsMatch();
        });
        confirmPasswordInput.addEventListener('input', checkPasswordsMatch);

        // ОТПРАВКА ФОРМЫ РЕГИСТРАЦИИ (DJAGO READY)
        registerForm.addEventListener('submit', (e) => {
            const isUsernameValid = validateUsername();
            const isEmailValid = validateEmail();
            const isPasswordStrong = validatePasswordStrength();
            const isPasswordsMatch = checkPasswordsMatch();

            // Если есть ошибка фронтенда — отменяем отправку и трясем форму
            if (!isUsernameValid || !isEmailValid || !isPasswordStrong || !isPasswordsMatch) {
                e.preventDefault();
                registerForm.style.transform = 'translateX(10px)';
                setTimeout(() => registerForm.style.transform = 'translateX(-10px)', 100);
                setTimeout(() => registerForm.style.transform = 'translateX(0)', 200);
                return;
            }

            // Иначе — форма улетает на сервер. Показываем лоадер для красоты.
            btnText.style.display = 'none';
            loader.style.display = 'block';
            submitBtn.style.pointerEvents = 'none';
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
            // Запрещаем пустые поля
            if (loginEmailInput.value.trim() === '' || loginPasswordInput.value.trim() === '') {
                e.preventDefault();
                loginForm.style.transform = 'translateX(10px)';
                setTimeout(() => loginForm.style.transform = 'translateX(-10px)', 100);
                setTimeout(() => loginForm.style.transform = 'translateX(0)', 200);
                return;
            }

            // Если всё ок — показываем анимацию загрузки и даем Django обработать запрос
            loginBtnText.style.display = 'none';
            loginLoader.style.display = 'block';
            loginSubmitBtn.style.pointerEvents = 'none';
        });
    }

    // (Сюда же добавь свою старую логику для восстановления пароля, если она нужна)
});