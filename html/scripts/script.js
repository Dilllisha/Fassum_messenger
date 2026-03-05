document.addEventListener('DOMContentLoaded', () => {
    // 1. Инициализация летающих текстов в Hero-блоке
    const initFlyingText = () => {
        const startContainer = document.querySelector('.start_container');
        if (!startContainer) return;

        const texts = [
            "молниеносный", "безопасный", "приватный", "минималистичный",
            "интуитивный", "зашифрованный", "без рекламы", "кроссплатформенный",
            "легкий", "независимый", "свободный", "бесперебойный",
            "синхронизированный", "современный"
        ];

        const createText = (text) => {
            const p = document.createElement('p');
            p.textContent = text;
            p.className = 'flying-text';

            const containerWidth = startContainer.clientWidth;
            const containerHeight = startContainer.clientHeight;
            
            const size = Math.random() * 20 + 16;
            const duration = Math.random() * 20 + 15;
            const delay = Math.random() * 10;

            const startX = Math.random() * (containerWidth - 150) + 50;
            const startY = Math.random() * (containerHeight - 100) + 50;
            const tx = (Math.random() - 0.5) * containerWidth * 0.6;
            const ty = (Math.random() - 0.5) * containerHeight * 0.6;
            const r = (Math.random() - 0.5) * 60;

            p.style.left = `${startX}px`;
            p.style.top = `${startY}px`;
            p.style.fontSize = `${size}px`;
            p.style.setProperty('--tx', `${tx}px`);
            p.style.setProperty('--ty', `${ty}px`);
            p.style.setProperty('--r', `${r}deg`);
            p.style.animation = `fly ${duration}s ease-in-out infinite ${delay}s`;

            return p;
        };

        texts.forEach(text => startContainer.appendChild(createText(text)));
    };

    // 2. Логика кнопки "Наверх"
    const initHomeButton = () => {
        const homeBtn = document.getElementById('homeBtn');
        if (!homeBtn) return;

        window.addEventListener('scroll', () => {
            // Показываем кнопку, если проскроллили больше 300px
            if (window.scrollY > 300) {
                homeBtn.classList.add('visible');
            } else {
                homeBtn.classList.remove('visible');
            }
        });

        homeBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };

    // 3. Фикс высоты экрана для мобильных браузеров (address bar issue)
    const fixViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 4. Мобильное меню (Гамбургер)
    const initMobileMenu = () => {
        const hamburger = document.querySelector('.hamburger-menu');
        const navMenu = document.querySelector('.nav-menu');

        if (!hamburger || !navMenu) return;

        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    };

    // Запускаем все функции
    initFlyingText();
    initHomeButton();
    initMobileMenu();
    
    // Вычисляем высоту при загрузке и изменении размера окна
    fixViewportHeight();
    window.addEventListener('resize', fixViewportHeight);
});