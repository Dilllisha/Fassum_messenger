document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.burger-menu');
    const sidebar = document.querySelector('.chats');
    const folderItems = document.querySelectorAll('.folder-item');
  
    // Изначальное состояние — компактное меню
    sidebar.classList.add('compact');
  
    burger.addEventListener('click', () => {
      sidebar.classList.toggle('compact');
  
      // Если меню развёрнуто, фокусируем поле поиска
      if (!sidebar.classList.contains('compact')) {
        setTimeout(() => {
          const searchInput = document.querySelector('.search-bar input');
          if (searchInput) {
            searchInput.focus();
          }
        }, 300);
      }
    });
  
    // Переключение между папками
    folderItems.forEach(folder => {
      folder.addEventListener('click', () => {
        // Убираем активный класс у всех папок
        folderItems.forEach(f => f.classList.remove('active'));
        // Добавляем активный класс текущей папке
        folder.classList.add('active');
      });
    });
  });
  