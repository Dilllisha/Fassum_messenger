document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. БОКОВАЯ ПАНЕЛЬ И ПАПКИ (SIDEBAR & FOLDERS)
    // =========================================
    const burger = document.querySelector('.burger-menu');
    const sidebar = document.querySelector('.chats');
    const folderItems = document.querySelectorAll('.folder-item');

    if (sidebar && burger) {
        // Изначальное состояние — компактное меню
        sidebar.classList.add('compact');

        burger.addEventListener('click', () => {
            sidebar.classList.toggle('compact');
            const searchInput = document.querySelector('.search-input');

            // Управление фокусом поиска при анимации
            if (sidebar.classList.contains('compact')) {
                if (searchInput) searchInput.blur();
            } else {
                setTimeout(() => {
                    if (searchInput) searchInput.focus();
                }, 350); // Ждем окончания CSS анимации
            }
        });
    }

    // Переключение между папками
    folderItems.forEach(folder => {
        folder.addEventListener('click', () => {
            folderItems.forEach(f => f.classList.remove('active'));
            folder.classList.add('active');
        });
    });

    // =========================================
    // 2. СПИСОК ЧАТОВ (CHAT LIST)
    // =========================================
    const initChatHandlers = () => {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(chat => {
            chat.addEventListener('click', () => {
                const currentActive = document.querySelector('.chat-item.active');
                if (chat === currentActive) return;

                if (currentActive) currentActive.classList.remove('active');
                chat.classList.add('active');
            });
        });
    };

    initChatHandlers();

    // Наблюдатель для динамически добавляемых чатов
    const chatsListContainer = document.querySelector('.chats-list');
    if (chatsListContainer) {
        const observer = new MutationObserver(initChatHandlers);
        observer.observe(chatsListContainer, { childList: true, subtree: true });
    }

    // =========================================
    // 3. ОТПРАВКА СООБЩЕНИЙ (MESSAGING)
    // =========================================
    const messageInput = document.querySelector('.input-wrapper input');
    const sendBtn = document.querySelector('.send-btn');
    const messagesContainer = document.querySelector('.messages-container');

    if (messageInput && sendBtn && messagesContainer) {
        const sendMessage = () => {
            const text = messageInput.value.trim();
            if (text === '') return;

            const messageDiv = document.createElement('div');
            messageDiv.className = 'message outgoing';
            
            const now = new Date();
            const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                               now.getMinutes().toString().padStart(2, '0');

            messageDiv.innerHTML = `
                <div class="message-text">${text}</div>
                <div class="message-time">${timeString}</div>
            `;

            messagesContainer.appendChild(messageDiv);
            messageInput.value = '';
            
            // Скролл вниз
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        };

        sendBtn.addEventListener('click', sendMessage);

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Опускаем скролл вниз при загрузке
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // =========================================
    // 4. ПАНЕЛЬ ЭМОДЗИ И СТИКЕРОВ (MEDIA PICKER)
    // =========================================
    const emojiBtn = document.querySelector('.emoji-btn');
    const mediaPicker = document.getElementById('mediaPicker');
    const mediaTabs = document.querySelectorAll('.media-tab');
    const mediaPanes = document.querySelectorAll('.media-pane');
    const emojis = document.querySelectorAll('.emoji-grid span'); // Находим все смайлики

    if (emojiBtn && mediaPicker) {
        // Открытие/закрытие попапа при клике на смайлик
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            mediaPicker.classList.toggle('active');
        });

        // Закрытие при клике мимо попапа
        document.addEventListener('click', (e) => {
            if (mediaPicker.classList.contains('active') && 
                !mediaPicker.contains(e.target) && 
                e.target !== emojiBtn) {
                mediaPicker.classList.remove('active');
            }
        });

        mediaPicker.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Логика переключения вкладок
        mediaTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                mediaTabs.forEach(t => t.classList.remove('active'));
                mediaPanes.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');

                const targetPaneId = `pane-${tab.dataset.tab}`;
                const targetPane = document.getElementById(targetPaneId);
                if (targetPane) targetPane.classList.add('active');
            });
        });

        // НОВОЕ: Логика вставки эмодзи в поле ввода
        if (emojis.length > 0 && messageInput) {
            emojis.forEach(emoji => {
                emoji.addEventListener('click', () => {
                    // Добавляем текст смайлика к текущему тексту в поле ввода
                    messageInput.value += emoji.textContent;
                    
                    // Возвращаем фокус на поле ввода, чтобы можно было сразу продолжить печатать
                    messageInput.focus();
                });
            });
        }
    }

    // =========================================
    // 5. МОДАЛЬНОЕ ОКНО ВЫХОДА (QUIT MODAL)
    // =========================================
    const quitBtn = document.querySelector('.quit-container');
    const modalOverlay = document.getElementById('quitModal');
    
    if (quitBtn && modalOverlay) {
        const cancelQuitBtn = document.getElementById('cancelQuit');
        const confirmQuitBtn = document.getElementById('confirmQuit');

        quitBtn.addEventListener('click', () => {
            modalOverlay.classList.add('active');
        });

        if (cancelQuitBtn) {
            cancelQuitBtn.addEventListener('click', () => {
                modalOverlay.classList.remove('active');
            });
        }

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        });

        if (confirmQuitBtn) {
            confirmQuitBtn.addEventListener('click', () => {
                console.log('Пользователь подтвердил выход из системы');
                // Логика выхода (очистка токенов, redirect)
                modalOverlay.classList.remove('active');
            });
        }
    }
});