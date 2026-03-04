document.addEventListener('DOMContentLoaded', () => {
    const startContainer = document.querySelector('.start_container');
    if (!startContainer) return; // Проверка на существование контейнера

    const texts = ['Fassum', 'Messenger', 'Welcome', 'Chat', 'Connect', 'Hello', 'World'];

    // Получаем размеры контейнера
    const getContainerSize = () => ({
        width: startContainer.clientWidth,
        height: startContainer.clientHeight
    });

    // Функция создания элемента
    const createFlyingText = (text, index) => {
        const p = document.createElement('p');
        p.textContent = text;
        p.className = 'flying-text';

        const { width: containerWidth, height: containerHeight } = getContainerSize();

        // Случайные параметры
        const size = Math.random() * 20 + 16; // 16-36px
        const duration = Math.random() * 20 + 15; // 15-35s
        const delay = Math.random() * 10; // 0-10s

        // Случайная начальная позиция с отступами
        const startX = Math.random() * (containerWidth - 100) + 50;
        const startY = Math.random() * (containerHeight - 100) + 50;

        // Случайная конечная позиция (относительно начальной)
        const tx = (Math.random() - 0.5) * containerWidth * 0.6;
        const ty = (Math.random() - 0.5) * containerHeight * 0.6;
        const r = (Math.random() - 0.5) * 60; // -30 to 30deg

        // Устанавливаем начальные позиции и переменные
        p.style.left = `${startX}px`;
        p.style.top = `${startY}px`;
        p.style.fontSize = `${size}px`;
        p.style.setProperty('--startX', `${startX}px`);
        p.style.setProperty('--startY', `${startY}px`);
        p.style.setProperty('--tx', `${tx}px`);
        p.style.setProperty('--ty', `${ty}px`);
        p.style.setProperty('--r', `${r}deg`);
        p.style.animation = `fly ${duration}s ease-in-out infinite ${delay}s`;

        return p;
    };

    // Создаём элементы
    texts.forEach((text, index) => {
        startContainer.appendChild(createFlyingText(text, index));
    });

    // Обновляем позиции при изменении размера окна
    window.addEventListener('resize', () => {
        document.querySelectorAll('.flying-text').forEach(p => {
            const { width: containerWidth, height: containerHeight } = getContainerSize();
            let left = parseFloat(p.style.left);
            let top = parseFloat(p.style.top);
        })
    })
})