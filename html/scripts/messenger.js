document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.burger-menu');
    const sidebar = document.querySelector('.chats');
    const folderItems = document.querySelectorAll('.folder-item');
  
    // Изначальное состояние — компактное меню
    sidebar.classList.add('compact');
  
    burger.addEventListener('click', () => {
      sidebar.classList.toggle('compact');
  
      // При сворачивании убираем фокус с поиска
      if (sidebar.classList.contains('compact')) {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.blur();
      }
  
      // После завершения анимации фокусируем поиск при разворачивании
      if (!sidebar.classList.contains('compact')) {
        setTimeout(() => {
          const searchInput = document.querySelector('.search-input');
          if (searchInput) searchInput.focus();
        }, 350); // Время таймаута = длительности анимации + запас
      }
    });
  
    // Переключение между папками
    folderItems.forEach(folder => {
      folder.addEventListener('click', () => {
        folderItems.forEach(f => f.classList.remove('active'));
        folder.classList.add('active');
      });
    });
  
    // Функция для инициализации обработчиков чатов
    const initChatHandlers = () => {
      const chatItems = document.querySelectorAll('.chat-item');
      chatItems.forEach((chat, index) => {
        chat.addEventListener('click', () => {
          // Логика переключения активного чата
          const currentActive = document.querySelector('.chat-item.active');
          if (chat === currentActive) return;
  
          if (currentActive) currentActive.classList.remove('active');
          chat.classList.add('active');
        });
      });
    };
  
    initChatHandlers();
  
    // Наблюдатель для динамических чатов
    const observer = new MutationObserver(initChatHandlers);
    observer.observe(document.querySelector('.chats-list') || document.body, {
      childList: true,
      subtree: true
    });
    // Логика модального окна выхода
    const quitBtn = document.querySelector('.quit-container');
    const modalOverlay = document.getElementById('quitModal');
    const cancelQuitBtn = document.getElementById('cancelQuit');
    const confirmQuitBtn = document.getElementById('confirmQuit');

    // Открываем модалку при клике на кнопку выхода
    quitBtn.addEventListener('click', () => {
        modalOverlay.classList.add('active');
    });

    // Закрываем при клике на "Отмена"
    cancelQuitBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });

    // Закрываем, если пользователь кликнул мимо окна (на темный фон)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });

    // Действие при подтверждении выхода
    confirmQuitBtn.addEventListener('click', () => {
        console.log('Пользователь подтвердил выход из системы');
        // В будущем здесь будет логика очистки токенов и переадресации, например:
        // window.location.href = 'login.html';
        
        modalOverlay.classList.remove('active'); // Временно просто закрываем окно
    });
  });
  