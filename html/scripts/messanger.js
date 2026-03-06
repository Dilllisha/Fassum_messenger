document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.burger-menu');
    const sidebar = document.querySelector('.chats');
    
    burger.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
    });
});
