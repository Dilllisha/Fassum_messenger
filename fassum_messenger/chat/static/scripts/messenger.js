document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
    // =========================================
    window.currentChatId = null;
    window.lastMsgId = 0;
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

    const updateChatStatus = (statusText, isTyping = false) => {
        const statusEl = document.querySelector('.chat-header .status');
        if (!statusEl) return;

        if (isTyping) {
            statusEl.innerText = 'печатает...';
            statusEl.style.color = '#10b981'; // Выделяем активное действие цветом
        } else {
            statusEl.innerText = statusText;
            statusEl.style.color = (statusText === 'online') ? '#10b981' : '#9ca3af';
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
                    if (data.messages.length > 0) {
                        data.messages.forEach(msg => renderMessage(msg));
                    }

                    if (data.read_ids && data.read_ids.length > 0) {
                        data.read_ids.forEach(id => {
                            const msgEl = document.querySelector(`.message.outgoing[data-id="${id}"]`);
                            if (msgEl) {
                                const container = msgEl.querySelector('.status-container');
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

                    // Обновляем статус с сервера, если он изменился во время переписки
                    updateChatStatus(data.other_user_status, data.is_typing);

                    if (document.querySelector('.chat-window:hover')) {
                        markChatAsRead(window.currentChatId);
                    }
                }
            })
            .catch(err => console.error("Ошибка поллинга:", err));
    };

    const loadMessages = (chatId) => {
        window.lastMsgId = 0;
        messagesContainer.innerHTML = '<div style="text-align:center; padding:20px; color:gray;">Загрузка истории...</div>';

        fetch(`/api/messages/${chatId}/`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok') {
                    messagesContainer.innerHTML = '';
                    data.messages.forEach(msg => renderMessage(msg, false));

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

    messageInput?.addEventListener('input', () => {
        if (!window.currentChatId) return;

        if (!isTypingSent) {
            isTypingSent = true;
            sendTypingStatus(true);
        }

        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isTypingSent = false;
            sendTypingStatus(false);
        }, 3000); // Если 3 секунды ничего не менялось — считаем, что перестал печатать
    });

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

    const sendTextMessage = () => {
        const text = messageInput.value.trim();
        if (!text || !window.currentChatId) return;

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
                renderMessage({ ...data.message, is_my: true });
                messageInput.value = '';

                const activeChat = document.querySelector(`.chat-item[data-id="${window.currentChatId}"]`);
                if (activeChat) activeChat.querySelector('.last-message').innerText = data.message.text;
            }
        });
    };

    document.querySelector('.send-btn')?.addEventListener('click', sendTextMessage);
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMessage();
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
    const INACTIVITY_LIMIT = 3 * 60 * 1000; // 3 минуты
    let isPinging = false; // Защита от спама запросами

    const resetActivity = () => { lastActivityTime = Date.now(); };

    // Отслеживаем движения мыши и нажатия
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt =>
        document.addEventListener(evt, resetActivity)
    );

    const sendPing = () => {
        if (isPinging) return; // Если запрос уже летит, не дублируем
        if (Date.now() - lastActivityTime < INACTIVITY_LIMIT) {
            isPinging = true;
            fetch('/api/ping/', {
                method: 'POST',
                headers: { 'X-CSRFToken': getCSRF() }
            })
            .catch(err => console.error("Ping error:", err))
            .finally(() => {
                // Разрешаем следующий пинг через небольшую задержку (защита от спама при focus)
                setTimeout(() => { isPinging = false; }, 2000);
            });
        }
    };

    // Стандартный пинг раз в минуту
    setInterval(sendPing, 60000);
    sendPing();

    // --- НОВАЯ МАГИЯ: МГНОВЕННЫЙ ОНЛАЙН ПРИ ВОЗВРАЩЕНИИ ---

    // 1. Когда пользователь возвращается на вкладку браузера
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            resetActivity();
            sendPing(); // Мгновенно говорим серверу "Я тут!"

            // Заодно сразу дергаем сообщения, чтобы обновить статус собеседника без ожидания
            if (window.currentChatId) {
                checkNewMessages();
            }
        }
    });

    // 2. Когда пользователь кликает по окну браузера (если оно было открыто на фоне)
    window.addEventListener('focus', () => {
        resetActivity();
        sendPing();
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
});