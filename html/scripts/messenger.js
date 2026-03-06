document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.burger-menu');
  const sidebar = document.querySelector('.chats');
  const folderItems = document.querySelectorAll('.folder-item');

  // Изначальное состояние — компактное меню
  sidebar.classList.add('compact');

  burger.addEventListener('click', () => {
    sidebar.classList.toggle('compact');

    // Убираем фокус с поля поиска при сворачивании
    if (sidebar.classList.contains('compact')) {
      const searchInput = document.querySelector('.search-input');
      if (searchInput) searchInput.blur();
    }

    // Если меню развёрнуто, фокусируем поле поиска после завершения анимации
    if (!sidebar.classList.contains('compact')) {
      setTimeout(() => {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.focus();
      }, 400); // Время таймаута = длительности анимации + запас
    }
  });

  // Переключение между папками
  folderItems.forEach(folder => {
    folder.addEventListener('click', () => {
      folderItems.forEach(f => f.classList.remove('active'));
      folder.classList.add('active');
    });
  });

  // Функция для инициализации обработчиков чатов (остаётся без изменений)
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

  // Наблюдатель для динамических чатов (остаётся без изменений)
  const observer = new MutationObserver(initChatHandlers);
  observer.observe(document.querySelector('.chats-list') || document.body, {
    childList: true,
    subtree: true
  });
});
