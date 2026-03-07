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
    // =========================================
    // 6. ЛОГИКА ОКНА НАСТРОЕК
    // =========================================
    const openSettingsBtn = document.getElementById('openSettings');
    const settingsSidebar = document.getElementById('settingsSidebar');
    const settingsOverlay = document.getElementById('settingsOverlay'); // Находим наш новый оверлей

    if (openSettingsBtn && settingsSidebar && settingsOverlay) {
        // Открытие/закрытие по клику на шестеренку
        openSettingsBtn.addEventListener('click', () => {
            settingsSidebar.classList.toggle('active');
            settingsOverlay.classList.toggle('active');
        });

        // Закрытие при клике по размытому фону (оверлею)
        settingsOverlay.addEventListener('click', () => {
            settingsSidebar.classList.remove('active');
            settingsOverlay.classList.remove('active');
        });
    }

    // =========================================
    // 7. КОНТЕКСТНЫЕ МЕНЮ (ПРАВЫЙ КЛИК)
    // =========================================
    const messageCtxMenu = document.getElementById('messageCtxMenu');
    const chatCtxMenu = document.getElementById('chatCtxMenu');
    
    // Универсальная функция для показа меню в нужном месте
    const showContextMenu = (e, menuElement) => {
        e.preventDefault(); // Отключаем стандартное меню браузера
        
        // Скрываем все открытые меню
        messageCtxMenu.classList.remove('active');
        chatCtxMenu.classList.remove('active');

        // Вычисляем координаты, чтобы меню не вылезало за края экрана
        let x = e.clientX;
        let y = e.clientY;
        const menuWidth = 220; 
        const menuHeight = menuElement.offsetHeight;

        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

        menuElement.style.left = `${x}px`;
        menuElement.style.top = `${y}px`;
        menuElement.classList.add('active');
    };

    // Слушаем правый клик на контейнере с сообщениями
    if (messagesContainer && messageCtxMenu) {
        messagesContainer.addEventListener('contextmenu', (e) => {
            // Ищем ближайший элемент сообщения, по которому кликнули
            const messageElement = e.target.closest('.message');
            if (messageElement) {
                showContextMenu(e, messageCtxMenu);
            }
        });
    }

    // Слушаем правый клик на списке чатов
    const chatsList = document.querySelector('.chats-list');
    if (chatsList && chatCtxMenu) {
        chatsList.addEventListener('contextmenu', (e) => {
            // Ищем ближайший чат, по которому кликнули
            const chatElement = e.target.closest('.chat-item');
            if (chatElement) {
                showContextMenu(e, chatCtxMenu);
            }
        });
    }

    // Скрываем меню при клике левой кнопкой мыши в любом месте
    document.addEventListener('click', (e) => {
        if (messageCtxMenu && messageCtxMenu.classList.contains('active')) {
            messageCtxMenu.classList.remove('active');
        }
        if (chatCtxMenu && chatCtxMenu.classList.contains('active')) {
            chatCtxMenu.classList.remove('active');
        }
    });
    // =========================================
    // 8. ЛОГИКА МЕНЮ ВЛОЖЕНИЙ (СКРЕПКА)
    // =========================================
    const attachBtn = document.querySelector('.attach-btn');
    const attachmentMenu = document.getElementById('attachmentMenu');

    if (attachBtn && attachmentMenu) {
        // Открыть/закрыть меню по клику на скрепку
        attachBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Не даем клику уйти дальше и сразу закрыть меню
            attachmentMenu.classList.toggle('active');
        });

        // Закрыть меню при клике в любое другое место
        document.addEventListener('click', (e) => {
            if (!attachmentMenu.contains(e.target) && !attachBtn.contains(e.target)) {
                attachmentMenu.classList.remove('active');
            }
        });
    }

    // =========================================
    // 9. ЛОГИКА ПУСТОГО СОСТОЯНИЯ И ПЕРЕКЛЮЧЕНИЯ ЧАТОВ
    // =========================================
    const chatItems = document.querySelectorAll('.chat-item');
    const emptyState = document.getElementById('emptyState');

    if (chatItems.length > 0 && emptyState) {
        chatItems.forEach(chat => {
            chat.addEventListener('click', () => {
                // 1. Убираем активный класс у всех чатов
                chatItems.forEach(c => c.classList.remove('active'));
                
                // 2. Делаем кликнутый чат активным
                chat.classList.add('active');
                
                // 3. Прячем пустое состояние (открываем переписку)
                emptyState.classList.add('hidden');
            });
        });
    }
    
});