document.addEventListener('DOMContentLoaded', () => {
    const startContainer = document.querySelector('.start_container');
    if (!startContainer) return;

    const texts = [
        "молниеносный", "безопасный", "приватный", "минималистичный", 
        "интуитивный", "зашифрованный", "без рекламы", "кроссплатформенный", 
        "легкий", "независимый", "свободный", "бесперебойный", 
        "синхронизированный", "современный"
    ];

    const getContainerSize = () => ({
        width: startContainer.clientWidth,
        height: startContainer.clientHeight
    });

    const createFlyingText = (text, index) => {
        const p = document.createElement('p');
        p.textContent = text;
        p.className = 'flying-text';

        const { width: containerWidth, height: containerHeight } = getContainerSize();

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

    texts.forEach((text, index) => {
        startContainer.appendChild(createFlyingText(text, index));
    });

    window.addEventListener('resize', () => {
        const { width: containerWidth, height: containerHeight } = getContainerSize();
        
        document.querySelectorAll('.flying-text').forEach(p => {
            let left = parseFloat(p.style.left);
            let top = parseFloat(p.style.top);
            
            if (left > containerWidth - 100) {
                p.style.left = `${Math.max(50, containerWidth - 150)}px`;
            }
            if (top > containerHeight - 50) {
                p.style.top = `${Math.max(50, containerHeight - 100)}px`;
            }
        });
    });
});