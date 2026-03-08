document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
    // =========================================
    window.currentChatId = null;
    window.lastMsgId = 0;
    window.currentFolderId = 'all';
    let pollingTimer = null;
    let pendingFiles = [];

    const emptyState = document.getElementById('emptyState');
    const messagesContainer = document.querySelector('.messages-container');
    const messageInput = document.querySelector('.input-wrapper input');
    const chatsListContainer = document.querySelector('.chats-list');

    const getCSRF = () => document.querySelector('[name=csrfmiddlewaretoken]')?.value;

    // =========================================
    // 1. ОТРИСОВКА СООБЩЕНИЙ И СТАТУСА
    // =========================================

    // Функция для жесткого обновления фавиконки
function setFavicon(url) {
    let oldLink = document.getElementById('app-favicon');
    if (oldLink) {
        document.head.removeChild(oldLink); // Удаляем старую иконку
    }

    let newLink = document.createElement('link');
    newLink.id = 'app-favicon';
    newLink.rel = 'icon';
    newLink.type = 'image/svg+xml'; // Обязательно указываем, что это SVG
    // Добавляем параметр со временем, чтобы сбить кэш браузера
    newLink.href = url + '?v=' + new Date().getTime();

    document.head.appendChild(newLink); // Вставляем новую
}


    const updateChatStatus = (statusText, isTyping = false) => {
        const statusEl = document.querySelector('.chat-header .status');
        if (!statusEl) return;

        if (isTyping) {
            statusEl.innerText = 'печатает...';
            statusEl.style.color = '#10b981';
        } else {
            statusEl.innerText = statusText;
            statusEl.style.color = (statusText === 'online') ? '#10b981' : '#9ca3af';
        }

        const activeChat = document.querySelector(`.chat-item[data-id="${window.currentChatId}"]`);
        if (activeChat) {
            // --- НОВОЕ: Запоминаем свежий статус в HTML, чтобы при переключении не было морганий ---
            activeChat.setAttribute('data-status', statusText);

            const avatarCircle = activeChat.querySelector('.avatar-circle');
            let dot = avatarCircle.querySelector('.online-dot');

            if (statusText === 'online' || isTyping) {
                if (!dot) {
                    dot = document.createElement('div');
                    dot.className = 'online-dot';
                    avatarCircle.appendChild(dot);
                }
            } else {
                if (dot) dot.remove();
            }
        }
    };

    const renderMessage = (msg, scroll = true) => {
        if (document.querySelector(`.message[data-id="${msg.id}"]`)) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${msg.is_my ? 'outgoing' : 'incoming'}`;
        msgDiv.setAttribute('data-id', msg.id);

        let mediaHtml = '';
        if (msg.image_urls && msg.image_urls.length > 0) {
            mediaHtml = '<div class="message-gallery">';
            msg.image_urls.forEach(url => {
                mediaHtml += `<img src="${url}" class="gallery-image" alt="Изображение" onclick="window.open('${url}')">`;
            });
            mediaHtml += '</div>';
        }

        const getChecks = (isRead) => `
            <svg class="checks-svg ${isRead ? 'read' : ''}" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M5 12l5 5L20 7"></path>
                ${isRead ? '<path class="check-double" d="M9 17l5 5L24 12" style="transform: translateX(-4px);"></path>' : ''}
            </svg>`;

        msgDiv.innerHTML = `
            <div class="message-content">
                ${mediaHtml}
                ${msg.text ? `<div class="message-text">${msg.text}</div>` : ''}
            </div>
            <div class="message-meta">
                <span class="message-time">${msg.time}</span>
                <div class="status-container">${msg.is_my ? getChecks(msg.is_read) : ''}</div>
            </div>`;

        messagesContainer.appendChild(msgDiv);

        if (!msg.is_my && document.visibilityState === 'visible' && document.hasFocus()) {
            markChatAsRead(window.currentChatId);
        }

        if (msg.id > window.lastMsgId) window.lastMsgId = msg.id;

        if (scroll) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    };

    const markChatAsRead = (chatId) => {
        if (!chatId) return;
        fetch(`/api/mark-read/${chatId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRF() }
        });
    };

    // =========================================
    // 2. ПОЛЛИНГ И ЗАГРУЗКА ИСТОРИИ
    // =========================================

    const checkNewMessages = () => {
        if (!window.currentChatId) return;

        fetch(`/api/messages/${window.currentChatId}/?last_id=${window.lastMsgId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    // 1. Отрисовка новых входящих сообщений
                    if (data.messages.length > 0) {
                        data.messages.forEach(msg => renderMessage(msg));
                        // ... логика уведомлений и фавиконки ...
                    }

                    // 2. НОВОЕ: ОБНОВЛЯЕМ ГАЛОЧКИ ДЛЯ ТВОИХ ОТПРАВЛЕННЫХ СООБЩЕНИЙ
                    // Если сервер прислал ID сообщений, которые собеседник только что прочитал
                    if (data.read_ids && data.read_ids.length > 0) {
                        data.read_ids.forEach(id => {
                            // Ищем на странице ТВОЕ исходящее сообщение с этим ID
                            const msgEl = document.querySelector(`.message.outgoing[data-id="${id}"]`);
                            if (msgEl) {
                                const container = msgEl.querySelector('.status-container');
                                // Если там еще нет двойной галочки — рисуем её
                                if (container && !container.querySelector('.check-double')) {
                                    container.innerHTML = `
                                        <svg class="checks-svg read" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                                            <path d="M5 12l5 5L20 7"></path>
                                            <path class="check-double" d="M9 17l5 5L24 12" style="transform: translateX(-4px);"></path>
                                        </svg>`;
                                }
                            }
                        });
                    }

                    // 3. Обновляем статус онлайн/печатает
                    updateChatStatus(data.other_user_status, data.is_typing);

                    // 4. Помечаем прочитанным, если окно активно
                    if (document.visibilityState === 'visible' && document.hasFocus()) {
                        markChatAsRead(window.currentChatId);
                    }
                }
            })
            .catch(err => console.error("Ошибка поллинга:", err));
    };

    // --- НОВОЕ: Глобальное обновление списка чатов ---
    const pollChatsList = () => {
        fetch(`/api/get-chats-list/?folder_id=${window.currentFolderId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    let isNewChatAdded = false;

                    // --- НОВОЕ: Собираем ID всех чатов, которые прислал сервер ---
                    const receivedIds = data.chats.map(chat => String(chat.id));

                    data.chats.forEach((chatData, index) => {
                        let chatEl = document.querySelector(`.chat-item[data-id="${chatData.id}"]`);

                        // 1. ЕСЛИ ЭТО НОВЫЙ ЧАТ
                        if (!chatEl) {
                            chatEl = document.createElement('div');
                            chatEl.className = 'chat-item';
                            chatEl.setAttribute('data-id', chatData.id);
                            chatEl.setAttribute('data-status', chatData.status_text);

                            const displayMessage = chatData.is_typing ? 'печатает...' : chatData.last_message;
                            const messageStyle = chatData.is_typing ? 'style="color: #10b981; font-weight: 500;"' : '';

                            chatEl.innerHTML = `
                                <div class="avatar-circle">
                                    <img src="${chatData.avatar_url}" class="avatar-image">
                                    ${chatData.is_online ? '<div class="online-dot"></div>' : ''}
                                </div>
                                <div class="chat-info">
                                    <div class="chat-name">${chatData.name}</div>
                                    <div class="last-message" ${messageStyle}>${displayMessage}</div>
                                </div>
                                <div class="chat-meta">
                                    <div class="message-time">${chatData.time}</div>
                                    <div class="unread-count" style="display: ${chatData.unread > 0 ? 'inline-block' : 'none'}">${chatData.unread}</div>
                                </div>
                            `;
                            chatsListContainer.appendChild(chatEl);
                            isNewChatAdded = true;
                        }
                        // 2. ЕСЛИ ЧАТ УЖЕ ЕСТЬ - ОБНОВЛЯЕМ ДАННЫЕ
                        else {
                            const lastMsgEl = chatEl.querySelector('.last-message');

                            if (chatData.is_typing) {
                                lastMsgEl.innerText = 'печатает...';
                                lastMsgEl.style.color = '#10b981';
                                lastMsgEl.style.fontWeight = '500';
                            } else {
                                lastMsgEl.innerText = chatData.last_message;
                                lastMsgEl.style.color = '';
                                lastMsgEl.style.fontWeight = '';
                            }

                            const timeEl = chatEl.querySelector('.message-time');
                            if (timeEl) timeEl.innerText = chatData.time;

                            const unreadBadge = chatEl.querySelector('.unread-count');
                            if (unreadBadge) {
                                if (chatData.unread > 0 && chatData.id != window.currentChatId) {
                                    unreadBadge.innerText = chatData.unread;
                                    unreadBadge.style.display = 'inline-block';
                                } else {
                                    unreadBadge.style.display = 'none';
                                }
                            }
                        }

                        // --- НОВОЕ: Обязательно показываем чат, если он был скрыт другой папкой ---
                        chatEl.style.display = 'flex';
                        chatEl.style.order = index;
                    });

                    // --- НОВОЕ: Прячем все чаты в панели, которых нет в текущей папке ---
                    document.querySelectorAll('.chat-item').forEach(el => {
                        if (!receivedIds.includes(el.getAttribute('data-id'))) {
                            el.style.display = 'none'; // Скрываем лишние
                        }
                    });
                    // ---------------------------------------------------------------------

                    if (isNewChatAdded && typeof initChatHandlers === 'function') {
                        initChatHandlers();
                        emptyState?.classList.add('hidden');
                    }
                }
            })
            .catch(err => console.error("Ошибка поллинга списка чатов:", err));
    };

    // --- НОВАЯ ФУНКЦИЯ: Поллинг списка папок ---
    // --- НОВАЯ ФУНКЦИЯ: Поллинг списка папок ---
    const pollFoldersList = () => {
        fetch('/api/get-folders-list/')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    const container = document.querySelector('.folders-container');
                    if (!container) return;

                    // 1. Очищаем контейнер полностью
                    container.innerHTML = '';

                    // 2. ВСЕГДА СОЗДАЕМ ПАПКУ "ВСЕ ЧАТЫ" ЧЕРЕЗ JS
                    const allChatsBtn = document.createElement('div');
                    allChatsBtn.className = `folder-item ${window.currentFolderId === 'all' ? 'active' : ''}`;
                    allChatsBtn.setAttribute('data-id', 'all');

                    // Красивая SVG-иконка диалога для "Все чаты"
                    const allChatsIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>`;

                    allChatsBtn.innerHTML = `
                        <div class="folder-icon">${allChatsIcon}</div>
                        <div class="folder-label">Все чаты</div>
                    `;

                    // Клик по "Все чаты"
                    allChatsBtn.onclick = () => {
                        document.querySelectorAll('.folder-item').forEach(el => el.classList.remove('active'));
                        allChatsBtn.classList.add('active');
                        window.currentFolderId = 'all';
                        pollChatsList(); // Мгновенно загружаем все чаты
                    };

                    container.appendChild(allChatsBtn);

                    // 3. ДОБАВЛЯЕМ КАСТОМНЫЕ ПАПКИ ИЗ БАЗЫ
                    data.folders.forEach(f => {
                        const item = document.createElement('div');
                        item.className = `folder-item ${window.currentFolderId == f.id ? 'active' : ''}`;
                        item.setAttribute('data-id', f.id);
                        item.innerHTML = `
                            <div class="folder-icon">${f.icon || '📁'}</div>
                            <div class="folder-label">${f.name}</div>
                        `;

                        // Клик по кастомной папке
                        item.onclick = () => {
                            document.querySelectorAll('.folder-item').forEach(el => el.classList.remove('active'));
                            item.classList.add('active');
                            window.currentFolderId = f.id;
                            pollChatsList(); // Загружаем чаты только для этой папки
                        };
                        container.appendChild(item);
                    });
                }
            });
    };

    // Запускаем глобальный поллинг каждые 4 секунды
    setInterval(pollChatsList, 4000);

    setInterval(pollFoldersList, 10000);
    pollFoldersList();

    const loadMessages = (chatId) => {
        window.lastMsgId = 0;
        messagesContainer.innerHTML = '<div style="text-align:center; padding:20px; color:gray;">Загрузка истории...</div>';

        fetch(`/api/messages/${chatId}/`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    messagesContainer.innerHTML = '';
                    data.messages.forEach(msg => renderMessage(msg, false));

                    // --- НОВОЕ: Моментально применяем 100% точный статус с сервера ---
                    updateChatStatus(data.other_user_status, data.is_typing);

                    setTimeout(() => messagesContainer.scrollTop = messagesContainer.scrollHeight, 150);

                    markChatAsRead(chatId);

                    if (pollingTimer) clearInterval(pollingTimer);
                    pollingTimer = setInterval(checkNewMessages, 3000);
                }
            });
    };

    document.querySelector('.chat-window')?.addEventListener('mouseenter', () => {
        if (window.currentChatId) markChatAsRead(window.currentChatId);
    });

    // =========================================
    // 3. ОТПРАВКА ТЕКСТА
    // =========================================

    let typingTimer;
    let isTypingSent = false;

    // 1. Сама функция: отправляет статус на сервер
    const sendTypingStatus = (isTyping) => {
        const formData = new FormData();
        formData.append('chat_id', window.currentChatId);
        formData.append('status', isTyping ? 'true' : 'false');

        fetch('/api/set-typing/', {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': getCSRF() }
        });
    };

    // 2. Отслеживаем набор текста в инпуте
    messageInput?.addEventListener('input', () => {
        if (!window.currentChatId) return;

        // Если статус еще не отправлен — отправляем
        if (!isTypingSent) {
            sendPing(); // <-- ДОБАВИЛИ: Подтверждаем серверу, что мы онлайн
            sendTypingStatus(true);
            isTypingSent = true;
        }

        clearTimeout(typingTimer);

        typingTimer = setTimeout(() => {
            sendTypingStatus(false);
            isTypingSent = false;
        }, 1500);
    });

    // 3. Отправка самого сообщения
    const sendTextMessage = () => {
        const text = messageInput.value.trim();
        if (!text || !window.currentChatId) return;

        // Сразу гасим статус "печатает"
        clearTimeout(typingTimer);
        if (isTypingSent) {
            sendTypingStatus(false);
            isTypingSent = false;
        }

        sendPing(); // Подтверждаем онлайн в момент отправки

        const formData = new FormData();
        formData.append('chat_id', window.currentChatId);
        formData.append('text', text);

        fetch('/api/send-message/', {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': getCSRF() }
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                // РИСУЕМ СООБЩЕНИЕ НА ЭКРАНЕ
                renderMessage({ ...data.message, is_my: true });

                // ОЧИЩАЕМ ПОЛЕ ВВОДА
                messageInput.value = '';

                // Обновляем текст слева в списке чатов
                const activeChat = document.querySelector(`.chat-item[data-id="${window.currentChatId}"]`);
                if (activeChat) activeChat.querySelector('.last-message').innerText = data.message.text;
            }
        })
        .catch(err => console.error("Ошибка отправки:", err));
    };
        // ... дальше код без изменений

    messageInput?.addEventListener('focus', () => {
    if (window.currentChatId) {
        markChatAsRead(window.currentChatId);
        }
    });

    // Слушатели кнопок отправки
    document.querySelector('.send-btn')?.addEventListener('click', sendTextMessage);
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMessage();
    });

    // 4. Слушаем вставку (Ctrl+V) картинок на уровне всего документа
    document.addEventListener('paste', (e) => {
        if (!window.currentChatId) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let found = false;

        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                found = true;
                e.preventDefault();
                pendingFiles.push(item.getAsFile());
            }
        }

        if (found) {
            if (!imagePreviewModal?.classList.contains('active')) {
                if (imageCaption && messageInput) {
                    imageCaption.value = messageInput.value;
                }
            }
            imagePreviewModal?.classList.add('active');
            if (typeof renderPreviewGrid === 'function') renderPreviewGrid();
        }
    });

    // =========================================
    // 4. ГАЛЕРЕЯ И ОТПРАВКА КАРТИНОК
    // =========================================

    const imagePreviewModal = document.getElementById('imagePreviewModal');
    const pastedImagesContainer = document.getElementById('pastedImagesContainer');
    const extraImagesInput = document.getElementById('extraImagesInput');
    const confirmImageSendBtn = document.getElementById('confirmImageSend');
    const imageCaption = document.getElementById('imageCaption');

    const renderPreviewGrid = () => {
        if (!pastedImagesContainer) return;

        pastedImagesContainer.innerHTML = '';

        pendingFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="preview">
                    <button class="remove-preview" data-index="${index}">&times;</button>
                `;
                pastedImagesContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });

        const addBtn = document.createElement('div');
        addBtn.className = 'add-more-item';
        addBtn.innerHTML = `<i class="fas fa-plus"></i><span>Добавить</span>`;
        addBtn.onclick = () => extraImagesInput?.click();

        pastedImagesContainer.appendChild(addBtn);
    };

    pastedImagesContainer?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-preview')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            pendingFiles.splice(index, 1);
            if (pendingFiles.length === 0) {
                closeImageModal();
            } else {
                renderPreviewGrid();
            }
        }
    });

    messageInput?.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let found = false;

        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                found = true;
                e.preventDefault();
                pendingFiles.push(item.getAsFile());
            }
        }

        if (found) {
            if (imageCaption) imageCaption.value = messageInput.value;
            imagePreviewModal?.classList.add('active');
            renderPreviewGrid();
        }
    });

    extraImagesInput?.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.type.startsWith('image/')) pendingFiles.push(file);
        });
        extraImagesInput.value = '';
        renderPreviewGrid();
    });

    confirmImageSendBtn?.addEventListener('click', () => {
        if (pendingFiles.length === 0 || !window.currentChatId) return;

        const caption = imageCaption?.value || '';
        confirmImageSendBtn.disabled = true;
        confirmImageSendBtn.innerText = 'Отправка...';

        const formData = new FormData();
        formData.append('chat_id', window.currentChatId);
        formData.append('text', caption);

        pendingFiles.forEach((file, index) => {
            formData.append('images', file, `image_${index}.png`);
        });

        fetch('/api/send-message/', {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': getCSRF() }
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                renderMessage({ ...data.message, is_my: true });
                closeImageModal();
                messageInput.value = '';

                const activeChat = document.querySelector(`.chat-item[data-id="${window.currentChatId}"]`);
                if (activeChat) activeChat.querySelector('.last-message').innerText = "Фотография";
            }
        })
        .catch(err => console.error("Ошибка при отправке файлов:", err))
        .finally(() => {
            confirmImageSendBtn.disabled = false;
            confirmImageSendBtn.innerText = 'Отправить все';
        });
    });

    const closeImageModal = () => {
        imagePreviewModal?.classList.remove('active');
        pendingFiles = [];
        if (pastedImagesContainer) pastedImagesContainer.innerHTML = '';
        if (imageCaption) imageCaption.value = '';
    };

    document.getElementById('closeImagePreview')?.addEventListener('click', closeImageModal);
    document.getElementById('cancelImageSend')?.addEventListener('click', closeImageModal);

    // =========================================
    // 5. ВЫБОР ЧАТА И ПОИСК
    // =========================================

    const initChatHandlers = () => {
        document.querySelectorAll('.chat-item').forEach(chat => {
            chat.onclick = () => {
                document.querySelectorAll('.chat-item').forEach(c => c.classList.remove('active'));
                chat.classList.add('active');
                emptyState?.classList.add('hidden');
                window.currentChatId = chat.dataset.id;

                // ИСПОЛЬЗУЕМ textContent, ЧТОБЫ ЧИТАТЬ ДАЖЕ СКРЫТЫЙ ТЕКСТ В КОМПАКТНОМ РЕЖИМЕ
                const name = chat.querySelector('.chat-name').textContent.trim();
                const avatar = chat.querySelector('.avatar-image')?.src;
                const header = document.querySelector('.chat-header');

                header.querySelector('.chat-name').innerText = name;

                // Безопасная проверка первой буквы (name[0])
                header.querySelector('.avatar-circle').innerHTML = avatar
                    ? `<img src="${avatar}" class="avatar-image">`
                    : (name[0] ? name[0].toUpperCase() : '');

                // Мгновенная подгрузка статуса из атрибута
                const instantStatus = chat.getAttribute('data-status') || 'офлайн';
                updateChatStatus(instantStatus);

                loadMessages(window.currentChatId);
            };
        });
    };

    initChatHandlers();
    if (chatsListContainer) new MutationObserver(initChatHandlers).observe(chatsListContainer, { childList: true });

    const searchInput = document.querySelector('.search-input');
    const searchResults = document.getElementById('searchResults');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (!query) {
                chatsListContainer.style.display = 'block';
                searchResults.style.display = 'none';
                return;
            }
            chatsListContainer.style.display = 'none';
            searchResults.style.display = 'block';

            fetch(`/api/search/?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => {
                    const localRes = document.getElementById('localResults');
                    const globalRes = document.getElementById('globalResults');
                    if(localRes) localRes.innerHTML = '';
                    if(globalRes) globalRes.innerHTML = '';

                    const build = (u) => {
                        const item = document.createElement('div');
                        item.className = 'search-item';
                        item.innerHTML = `
                            <div class="avatar-circle">
                                ${u.avatar_url ? `<img src="${u.avatar_url}" class="avatar-image">` : u.first_name[0].toUpperCase()}
                            </div>
                            <div class="chat-info">
                                <div class="chat-name">${u.first_name}</div>
                                <div class="last-message">@${u.username}</div>
                            </div>`;

                        item.onclick = () => {
                            fetch(`/api/get-chat/${u.id}/`).then(res => res.json()).then(chatData => {
                                if (chatData.status === 'ok') {
                                    if (chatData.is_new) { location.reload(); return; }
                                    document.querySelector(`.chat-item[data-id="${chatData.chat_id}"]`)?.click();
                                    searchInput.value = '';
                                    chatsListContainer.style.display = 'block';
                                    searchResults.style.display = 'none';
                                }
                            });
                        };
                        return item;
                    };
                    data.local.forEach(u => localRes?.appendChild(build(u)));
                    data.global.forEach(u => globalRes?.appendChild(build(u)));
                });
        });
    }

    // =========================================
    // 6. НАСТРОЙКИ, МОДАЛКИ И ПРОФИЛЬ
    // =========================================

    const burger = document.querySelector('.burger-menu');
    const sidebar = document.querySelector('.chats');
    if (sidebar && burger) {
        sidebar.classList.add('compact');
        burger.addEventListener('click', () => sidebar.classList.toggle('compact'));
    }

    document.getElementById('openSettings')?.addEventListener('click', () => {
        document.getElementById('settingsSidebar')?.classList.add('active');
        document.getElementById('settingsOverlay')?.classList.add('active');
    });

    document.getElementById('settingsOverlay')?.addEventListener('click', () => {
        document.getElementById('settingsSidebar')?.classList.remove('active');
        document.getElementById('settingsOverlay')?.classList.remove('active');
    });

    document.getElementById('myAccountBtn')?.addEventListener('click', () => {
        document.getElementById('accountModal')?.classList.add('active');
        document.getElementById('settingsSidebar')?.classList.remove('active');
        document.getElementById('settingsOverlay')?.classList.remove('active');
    });

    document.getElementById('closeAccountModal')?.addEventListener('click', () => document.getElementById('accountModal')?.classList.remove('active'));

    const accountForm = document.getElementById('accountForm');
    accountForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        fetch('/api/update-profile/', {
            method: 'POST',
            body: new FormData(accountForm),
            headers: { 'X-CSRFToken': getCSRF() }
        }).then(() => location.reload());
    });

    const avatarInput = document.getElementById('avatarInput');
    const imageToCrop = document.getElementById('imageToCrop');
    let cropper = null;

    avatarInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                imageToCrop.src = ev.target.result;
                document.getElementById('cropperModal')?.classList.add('active');
                setTimeout(() => {
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(imageToCrop, { aspectRatio: 1, viewMode: 1 });
                }, 100);
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('saveCropBtn')?.addEventListener('click', () => {
        cropper?.getCroppedCanvas({ width: 200, height: 200 }).toBlob(blob => {
            const fd = new FormData();
            fd.append('avatar', blob, 'avatar.jpg');
            fetch('/api/update-avatar/', {
                method: 'POST',
                body: fd,
                headers: { 'X-CSRFToken': getCSRF() }
            }).then(() => location.reload());
        });
    });

    // =========================================
    // 7. СТАТУС ОНЛАЙН И АКТИВНОСТЬ (PING)
    // =========================================

    let lastActivityTime = Date.now();
    let lastPingTime = 0; // НОВОЕ: Запоминаем, когда последний раз дергали сервер
    const INACTIVITY_LIMIT = 3 * 60 * 1000; // 3 минуты
    let isPinging = false;

    const sendPing = (force = false) => {
        if (isPinging && !force) return;

        if (force || (Date.now() - lastActivityTime < INACTIVITY_LIMIT)) {
            isPinging = true;
            lastPingTime = Date.now(); // Фиксируем время отправки пинга

            fetch('/api/ping/', {
                method: 'POST',
                headers: { 'X-CSRFToken': getCSRF() }
            })
            .catch(err => console.error("Ping error:", err))
            .finally(() => {
                setTimeout(() => { isPinging = false; }, 2000);
            });
        }
    };

    const resetActivity = () => {
        lastActivityTime = Date.now();

        // --- УМНЫЙ ПИНГ ---
        // Если юзер зашевелил мышкой, и мы не пинговали сервер больше 15 секунд — пингуем!
        if (Date.now() - lastPingTime > 15000) {
            sendPing();
        }
    };

    // Слушаем активность пользователя
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt =>
        document.addEventListener(evt, resetActivity)
    );

    setInterval(sendPing, 60000); // Резервный пинг
    sendPing(true);

    // --- НОВАЯ МАГИЯ: МГНОВЕННЫЙ ОНЛАЙН ПРИ ВОЗВРАЩЕНИИ ---

    // 1. Когда возвращаешься на вкладку (переключаешься с другой)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            resetActivity();
            sendPing(true); // Принудительно отправляем свой статус "online"

            setFavicon('/static/images/favicon.svg');
            document.title = 'Fassum Web';

            if (window.currentChatId) {
                checkNewMessages(); // Мгновенно опрашиваем сервер о статусе собеседника
            }
        }
    });

    // 2. Когда кликаешь по свернутому браузеру (например, из другой программы)
    window.addEventListener('focus', () => {
        resetActivity();
        sendPing(true); // Принудительный пинг

        if (window.currentChatId) {
            checkNewMessages(); // Мгновенный опрос
        }
    });
    // 3. НОВОЕ: Когда окно теряет фокус (кликнул в другую программу или на другой монитор)
    window.addEventListener('blur', () => {
        // Мгновенно снимаем статус "печатает...", если он был
        if (isTypingSent) {
            clearTimeout(typingTimer);
            sendTypingStatus(false);
            isTypingSent = false;
        }
    });

    // 4. Когда переключился на совершенно другую вкладку в браузере
    // 4. Когда переключился на совершенно другую вкладку в браузере
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (isTypingSent) {
                clearTimeout(typingTimer);
                sendTypingStatus(false);
                isTypingSent = false;
            }

            // --- ИСПРАВЛЕНИЕ 403 ОШИБКИ ---
            // Упаковываем CSRF-токен в тело запроса, так как sendBeacon не поддерживает заголовки
            const formData = new FormData();
            formData.append('csrfmiddlewaretoken', getCSRF());

            navigator.sendBeacon('/api/set-offline/', formData);
            // ------------------------------

        } else if (document.visibilityState === 'visible') {
            resetActivity();
            sendPing(true);

            setFavicon('/static/images/favicon.svg');
            document.title = 'Fassum Web';

            if (window.currentChatId) {
                checkNewMessages();
            }
        }
    });
    // =========================================
    // ЛОГИКА ВЫХОДА (QUIT MODAL)
    // =========================================
    const quitBtn = document.querySelector('.quit-container');
    const quitModal = document.getElementById('quitModal');
    const cancelQuit = document.getElementById('cancelQuit');

    // Открыть модалку при нажатии на ➜
    quitBtn?.addEventListener('click', () => {
        quitModal?.classList.add('active');
    });

    // Закрыть модалку при нажатии "Отмена"
    cancelQuit?.addEventListener('click', () => {
        quitModal?.classList.remove('active');
    });

    // Закрыть модалку при клике на темный фон
    quitModal?.addEventListener('click', (e) => {
        if (e.target === quitModal) {
            quitModal.classList.remove('active');
        }
    });

    // =========================================
    // ИСПРАВЛЕННОЕ КОНТЕКСТНОЕ МЕНЮ
    // =========================================
    const ctxMenu = document.getElementById('messageCtxMenu');
    let targetMsgId = null;

    messagesContainer.addEventListener('contextmenu', (e) => {
        // Ищем ближайшее сообщение в строке
        const messageEl = e.target.closest('.message');

        if (messageEl) {
            e.preventDefault(); // Запрещаем стандартное меню Windows
            e.stopPropagation(); // ОСТАНАВЛИВАЕМ всплытие, чтобы меню не закрылось сразу

            targetMsgId = messageEl.dataset.id;

            // Показываем меню
            ctxMenu.style.display = 'block';

            // Вычисляем позицию, чтобы меню не уходило за край экрана
            let x = e.clientX;
            let y = e.clientY;

            const menuWidth = 160;
            const menuHeight = 100;

            if (x + menuWidth > window.innerWidth) x -= menuWidth;
            if (y + menuHeight > window.innerHeight) y -= menuHeight;

            ctxMenu.style.left = `${x}px`;
            ctxMenu.style.top = `${y}px`;
        }
    });

    // Закрываем меню при клике в любое другое место,
    // НО не закрываем, если кликнули по самому меню
    document.addEventListener('click', (e) => {
        if (!ctxMenu.contains(e.target)) {
            ctxMenu.style.display = 'none';
        }
    });

    // Чтобы само меню не закрывалось при клике на свои пункты раньше времени
    ctxMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // =========================================
    // ПАПКИ: ОТКРЫТИЕ, ВЫБОР ЦВЕТА И СОХРАНЕНИЕ
    // =========================================

    const folderModal = document.getElementById('folderModal');
    let selectedFolderColor = '#3b82f6'; // По умолчанию синий

    // 1. Открытие модалки папок
    document.getElementById('openFoldersBtn')?.addEventListener('click', () => {
        document.getElementById('settingsSidebar').classList.remove('active');
        document.getElementById('settingsOverlay').classList.remove('active');
        folderModal.classList.add('active');

        // Подгружаем чаты
        const list = document.getElementById('chatsSelectionList');
        list.innerHTML = '<div style="padding:20px; text-align:center; color:gray;">Загрузка чатов...</div>';

        // Используем существующий эндпоинт, который мы делали для списка (или создай /api/get-all-chats/ в views)
        fetch('/api/get-all-chats/')
            .then(res => res.json())
            .then(data => {
                list.innerHTML = '';
                data.chats.forEach(chat => {
                    const item = document.createElement('div');
                    item.className = 'chat-select-item';
                    item.innerHTML = `
                        <input type="checkbox" value="${chat.id}" class="folder-chat-checkbox">
                        <span class="chat-select-name">${chat.name}</span>
                    `;
                    // Кликом по всей строке переключаем чекбокс
                    item.onclick = (e) => {
                        if(e.target.tagName !== 'INPUT') {
                            const cb = item.querySelector('input');
                            cb.checked = !cb.checked;
                        }
                    };
                    list.appendChild(item);
                });
            });
    });

    // 2. Выбор цвета
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedFolderColor = opt.getAttribute('data-color');
        });
    });

    // 3. Закрытие модалки
    document.getElementById('closeFolderModal')?.addEventListener('click', () => folderModal.classList.remove('active'));
    document.getElementById('cancelFolder')?.addEventListener('click', () => folderModal.classList.remove('active'));

    // 4. Сохранение папки
    document.getElementById('saveFolderBtn')?.addEventListener('click', () => {
        const name = document.getElementById('folderNameInput').value.trim();
        const selected = Array.from(document.querySelectorAll('.folder-chat-checkbox:checked')).map(cb => cb.value);

        if (!name) return alert('Введите название папки!');

        const fd = new FormData();
        fd.append('name', name);
        fd.append('color', selectedFolderColor); // Передаем цвет!
        selected.forEach(id => fd.append('chat_ids[]', id));

        fetch('/api/create-folder/', {
            method: 'POST',
            body: fd,
            headers: { 'X-CSRFToken': getCSRF() }
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                folderModal.classList.remove('active');
                document.getElementById('folderNameInput').value = '';
                // Сбрасываем цвет на дефолтный
                document.querySelectorAll('.color-option')[0].click();

                // Мгновенно обновляем сайдбар папок
                if (typeof pollFoldersList === 'function') pollFoldersList();
            }
        });
    });
});