document.addEventListener('DOMContentLoaded', () => {
    const pageWrapper = document.querySelector('.page-wrapper');
    const startContainer = document.querySelector('.start_container');
    const headContainer = document.querySelector('.head_container');
    const homeButton = document.getElementById('homeBtn');
    const ctaButton = document.querySelector('.cta_button');
  
    // 1. Инициализация летающих текстов
    if (startContainer) {
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
  
      // Обновляем позиции при ресайзе
      window.addEventListener('resize', () => {
        const { width: containerWidth, height: containerHeight } = getContainerSize();
        document.querySelectorAll('.flying-text').forEach(p => {
          const startX = Math.random() * (containerWidth - 150) + 50;
          const startY = Math.random() * (containerHeight - 100) + 50;
          p.style.left = `${startX}px`;
          p.style.top = `${startY}px`;
        });
      });
    }
  
    // 2. Кнопка CTA — переход к head_container
    if (headContainer && ctaButton) {
      ctaButton.addEventListener('click', () => {
        headContainer.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    } else {
      if (!headContainer) console.error('Элемент .head_container не найден');
      if (!ctaButton) console.error('Кнопка .cta_button не найдена');
    }
  
    // 3. Фиксированная кнопка «домой»
    if (homeButton && startContainer) {
      homeButton.addEventListener('click', () => {
        pageWrapper.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
  
      // Управление видимостью кнопки
      const toggleButtonVisibility = () => {
        if (pageWrapper.scrollTop < 100) {
          homeButton.style.opacity = '0';
          homeButton.style.pointerEvents = 'none';
        } else {
          homeButton.style.opacity = '1';
          homeButton.style.pointerEvents = 'auto';
        }
      };
  
      toggleButtonVisibility();
      pageWrapper.addEventListener('scroll', toggleButtonVisibility);
    } else {
      if (!homeButton) console.error('Кнопка с ID "homeBtn" не найдена');
    }
  
    // 4. Ограничение скролла ниже start_container
    if (pageWrapper && startContainer) {
      const handleScroll = () => {
        // Получаем нижнюю границу start_container относительно viewport
        const rect = startContainer.getBoundingClientRect();
        const startBottom = rect.bottom;
  
        // Если скролл ушёл выше нижней границы start_container, фиксируем на 0
        if (pageWrapper.scrollTop < 0) {
          pageWrapper.scrollTo({ top: 0, behavior: 'auto' });
        }
      };
  
      pageWrapper.addEventListener('scroll', handleScroll);
  
      // Инициализируем скролл в начало
      pageWrapper.scrollTo({ top: 0, behavior: 'auto' });
    }
});



function fixViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
  
// Инициализация при загрузке
fixViewportHeight();
  
// Перерасчёт при resize и load
window.addEventListener('resize', fixViewportHeight);
window.addEventListener('load', fixViewportHeight);


let lastWidth = window.innerWidth;

function monitorWidth() {
  const currentWidth = window.innerWidth;
  if (Math.abs(currentWidth - lastWidth) > 5) {
    console.warn('Ширина изменилась:', lastWidth, '→', currentWidth);
    lastWidth = currentWidth;
    // Принудительная коррекция
    document.body.style.width = '100%';
    document.documentElement.style.width = '100%';
  }
}

setInterval(monitorWidth, 100);

let lastY = 0;
let deltaY = 0;
let isScrolling = false;
const sections = document.querySelectorAll('.section');
const sectionHeights = Array.from(sections).map(el => el.offsetTop);

window.addEventListener('wheel', (e) => {
  const currentY = window.scrollY;
  deltaY = currentY - lastY;
  lastY = currentY;

  // Определяем «силу» скролла (например, > 100px за раз — сильный)
  if (Math.abs(deltaY) > 100 && !isScrolling) {
    isScrolling = true;
    requestAnimationFrame(scrollToNextSection);
  }
});

function scrollToNextSection() {
  const currentSectionIndex = getCurrentSectionIndex();
  const nextIndex = currentSectionIndex + (deltaY > 0 ? 1 : -1);

  if (nextIndex >= 0 && nextIndex < sections.length) {
    sections[nextIndex].scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  // Сброс флага через анимацию
  setTimeout(() => {
    isScrolling = false;
  }, 1000); // время анимации прокрутки
}

function getCurrentSectionIndex() {
  const scrollY = window.scrollY;
  for (let i = 0; i < sectionHeights.length; i++) {
    if (scrollY < sectionHeights[i]) return i;
  }
  return sectionHeights.length - 1;
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const header = document.querySelector('.head_container');
      if (!entry.isIntersecting) {
        header.classList.add('fixed');
      } else {
        header.classList.remove('fixed');
      }
    });
  }, {
    root: null,
    threshold: 0,
    rootMargin: '-80px 0px 0px 0px' // точка переключения на 80 px выше верха
  });
  
  observer.observe(document.querySelector('.start_container'));