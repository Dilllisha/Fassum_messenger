from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from .models import *
from django.db.models import Q
from django.utils import timezone
from django.utils.timezone import localtime
from datetime import timedelta
from django.templatetags.static import static


# Главная страница (Лендинг)
def index_view(request):
    return render(request, 'main_page.html')


# Страницы авторизации
def login_view(request):
    if request.method == 'POST':
        login_val = request.POST.get('username')
        password_val = request.POST.get('password')

        if '@' in login_val:
            try:
                user_obj = User.objects.get(email=login_val)
                login_val = user_obj.username
            except User.DoesNotExist:
                pass

        user = authenticate(request, username=login_val, password=password_val)

        if user is not None:
            login(request, user)
            return redirect('chat')
        else:
            return render(request, 'login.html', {'error_message': 'Неверный логин или пароль!'})

    return render(request, 'login.html')


def register_view(request):
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        user_name = request.POST.get('username')
        user_email = request.POST.get('email')
        user_password = request.POST.get('password')
        confirm_password = request.POST.get('confirmPassword')

        if user_password != confirm_password:
            return render(request, 'register.html', {'error_message': 'Пароли не совпадают!'})

        if User.objects.filter(username=user_name).exists():
            return render(request, 'register.html', {'error_message': 'Этот тег уже занят, придумайте другой!'})

        user = User.objects.create_user(username=user_name, email=user_email, password=user_password)
        user.first_name = first_name
        user.save()

        return redirect('login')

    return render(request, 'register.html')


def forgot_password_view(request):
    return render(request, 'forgot_password.html')


@login_required(login_url='login')
def messenger_view(request):
    user_chats = request.user.chats.all()
    user_folders = request.user.folders.all()

    chats_data = []
    for chat in user_chats:
        other_user = chat.participants.exclude(id=request.user.id).first()
        last_message = chat.messages.order_by('-created_at').first()

        # --- ДОБАВЛЯЕМ РАСЧЕТ НЕПРОЧИТАННЫХ ---
        unread_count = chat.messages.filter(is_read=False).exclude(sender=request.user).count()

        if other_user:
            status_text = "офлайн"
            is_online = False

            if hasattr(other_user, 'profile'):
                profile = other_user.profile
                if profile.is_online():
                    status_text = "online"
                    is_online = True
                elif profile.last_seen:
                    now = timezone.now()
                    diff = now - profile.last_seen
                    if diff < timedelta(hours=24):
                        time_str = localtime(profile.last_seen).strftime('%H:%M')
                        status_text = f"был(а) сегодня в {time_str}"
                    elif diff < timedelta(days=7):
                        status_text = "был(а) на этой неделе"

            chats_data.append({
                'id': chat.id,
                'other_user': other_user,
                'last_message': last_message,
                'status_text': status_text,
                'is_online': is_online,
                'unread_count': unread_count, # <-- Передаем в шаблон
            })

    return render(request, 'messenger.html', {
        'chats': chats_data,
        'folders': user_folders
    })


@login_required
def update_avatar(request):
    if request.method == 'POST' and request.FILES.get('avatar'):
        try:
            profile, created = Profile.objects.get_or_create(user=request.user)
            new_avatar = request.FILES['avatar']
            profile.avatar = new_avatar
            profile.save()

            return JsonResponse({
                'status': 'ok',
                'avatar_url': profile.avatar.url
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def update_profile(request):
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        email = request.POST.get('email')
        user = request.user

        if first_name:
            user.first_name = first_name
        if email:
            user.email = email

        user.save()

        return JsonResponse({
            'status': 'ok',
            'first_name': user.first_name,
            'email': user.email
        })

    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)


@login_required
def search_view(request):
    query = request.GET.get('q', '').strip()
    if not query:
        return JsonResponse({'status': 'ok', 'local': [], 'global': []})

    search_by_tag = query.startswith('@')
    clean_query = query[1:] if search_by_tag else query

    if search_by_tag:
        users = User.objects.filter(username__icontains=clean_query)
    else:
        users = User.objects.filter(
            Q(username__icontains=clean_query) | Q(first_name__icontains=clean_query)
        )

    users = users.exclude(id=request.user.id).distinct()

    existing_chat_users_ids = User.objects.filter(
        chats__participants=request.user
    ).exclude(id=request.user.id).values_list('id', flat=True)

    local_results = []
    global_results = []

    for user in users:
        if hasattr(user, 'profile'):
            avatar_url = user.profile.get_avatar_url
        else:
            avatar_url = static('images/default_avatar.png')

        user_data = {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name or user.username,
            'avatar_url': avatar_url
        }

        if user.id in existing_chat_users_ids:
            local_results.append(user_data)
        else:
            global_results.append(user_data)

    return JsonResponse({
        'status': 'ok',
        'local': local_results,
        'global': global_results
    })


@login_required
def get_or_create_chat(request, user_id):
    try:
        other_user = User.objects.get(id=user_id)
        chat = Chat.objects.filter(participants=request.user).filter(participants=other_user).first()

        if not chat:
            chat = Chat.objects.create()
            chat.participants.add(request.user, other_user)
            is_new = True
        else:
            is_new = False

        if hasattr(other_user, 'profile'):
            avatar_url = other_user.profile.get_avatar_url
        else:
            avatar_url = static('images/default_avatar.png')

        return JsonResponse({
            'status': 'ok',
            'chat_id': chat.id,
            'is_new': is_new,
            'other_user': {
                'first_name': other_user.first_name or other_user.username,
                'username': other_user.username,
                'avatar_url': avatar_url
            }
        })
    except User.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Пользователь не найден'}, status=404)


@login_required
def get_messages(request, chat_id):
    try:
        last_id = int(request.GET.get('last_id', 0))
    except (ValueError, TypeError):
        last_id = 0

    try:
        chat = Chat.objects.get(id=chat_id, participants=request.user)
        new_msgs = chat.messages.filter(id__gt=last_id).order_by('created_at')

        read_ids = list(chat.messages.filter(
            sender=request.user,
            is_read=True
        ).order_by('-created_at')[:50].values_list('id', flat=True))

        other_user = chat.participants.exclude(id=request.user.id).first()
        status_text = "офлайн"

        if other_user:
            try:
                profile, created = Profile.objects.get_or_create(user=other_user)

                if profile.is_online():
                    status_text = "online"
                elif profile.last_seen:
                    now = timezone.now()
                    diff = now - profile.last_seen

                    if diff < timedelta(hours=24):
                        time_str = localtime(profile.last_seen).strftime('%H:%M')
                        status_text = f"был(а) сегодня в {time_str}"
                    elif diff < timedelta(days=7):
                        status_text = "был(а) на этой неделе"
                    else:
                        status_text = "офлайн"
            except Exception as e:
                print(f"Ошибка статуса: {e}")

        messages_data = []
        for m in new_msgs:
            time_str = localtime(m.created_at).strftime('%H:%M') if m.created_at else ''

            messages_data.append({
                'id': m.id,
                'text': str(m.text) if m.text else '',
                'is_my': bool(m.sender == request.user),
                'time': time_str,
                'is_read': bool(m.is_read),
                'image_urls': list([img.image.url for img in m.images.all()])
            })

        is_typing = False
        if other_user and hasattr(other_user, 'profile'):
            if other_user.profile.typing_in == int(chat_id):
                is_typing = True

        return JsonResponse({
            'status': 'ok',
            'messages': messages_data,
            'read_ids': read_ids,  # <--- ДОБАВЬ ЭТУ СТРОКУ
            'other_user_status': status_text,
            'is_typing': is_typing
        })
    except Chat.DoesNotExist:
        return JsonResponse({'status': 'error'}, status=404)


@login_required
def send_message(request):
    if request.method == 'POST':
        chat_id = request.POST.get('chat_id')
        text = request.POST.get('text', '').strip()
        images = request.FILES.getlist('images')

        try:
            chat = Chat.objects.get(id=chat_id, participants=request.user)

            # --- ОБНОВЛЕНИЕ ОНЛАЙНА ПРИ ОТПРАВКЕ ---
            profile, _ = Profile.objects.get_or_create(user=request.user)
            profile.last_seen = timezone.now()
            # Снимаем статус печати, так как сообщение уже ушло
            profile.typing_in = 0
            profile.save(update_fields=['last_seen', 'typing_in'])
            # --------------------------------------

            message = Message.objects.create(chat=chat, sender=request.user, text=text)

            image_urls = []
            for img in images:
                msg_img = MessageImage.objects.create(message=message, image=img)
                image_urls.append(msg_img.image.url)

            return JsonResponse({
                'status': 'ok',
                'message': {
                    'id': message.id,
                    'text': message.text,
                    'image_urls': image_urls,
                    'time': localtime(message.created_at).strftime('%H:%M'),
                    'is_read': False
                }
            })
        except Chat.DoesNotExist:
            return JsonResponse({'status': 'error'}, status=404)


@login_required
def mark_as_read(request, chat_id):
    try:
        chat = Chat.objects.get(id=chat_id, participants=request.user)
        unread_messages = chat.messages.filter(is_read=False).exclude(sender=request.user)

        count = unread_messages.count()
        unread_messages.update(is_read=True)

        return JsonResponse({'status': 'ok', 'marked_count': count})
    except Chat.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Чат не найден'}, status=404)


@login_required
def ping_user(request):
    try:
        profile, created = Profile.objects.get_or_create(user=request.user)
        profile.last_seen = timezone.now()
        profile.save(update_fields=['last_seen'])
    except Exception as e:
        print(f"Ошибка пинга: {e}")
    return JsonResponse({'status': 'ok'})


@login_required
def set_typing(request):
    chat_id = request.POST.get('chat_id', 0)
    status = request.POST.get('status', 'false')

    profile, created = Profile.objects.get_or_create(user=request.user)

    if status == 'true':
        profile.typing_in = int(chat_id)
    else:
        profile.typing_in = 0

    # --- ОБНОВЛЕНИЕ ОНЛАЙНА ПРИ ПЕЧАТАНИИ ---
    profile.last_seen = timezone.now()
    profile.save(update_fields=['typing_in', 'last_seen'])  # Сохраняем сразу и статус, и время активности
    # ----------------------------------------

    return JsonResponse({'status': 'ok'})


@login_required
def delete_message(request, message_id):
    if request.method == 'POST':
        try:
            message = Message.objects.get(id=message_id, sender=request.user)
            message.delete()
            return JsonResponse({'status': 'ok'})
        except Message.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Сообщение не найдено или нет прав'}, status=403)
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def set_offline(request):
    try:
        profile, _ = Profile.objects.get_or_create(user=request.user)
        # Отматываем время на 10 минут назад, чтобы мгновенно стать "офлайн"
        profile.last_seen = timezone.now() - timedelta(minutes=10)
        profile.save(update_fields=['last_seen'])
        return JsonResponse({'status': 'ok'})
    except Exception as e:
        return JsonResponse({'status': e}, status=400)

@login_required
def get_chats_list(request):
    folder_id = request.GET.get('folder_id')

    # Фильтрация по папкам
    if folder_id and folder_id != 'all':
        try:
            folder = Folder.objects.get(id=folder_id, user=request.user)
            user_chats = folder.chats.all()
        except Folder.DoesNotExist:
            user_chats = request.user.chats.all()
    else:
        user_chats = request.user.chats.all()

    chats_data = []
    for chat in user_chats:
        other_user = chat.participants.exclude(id=request.user.id).first()
        last_message = chat.messages.order_by('-created_at').first()

        if other_user:
            profile, _ = Profile.objects.get_or_create(user=other_user)

            # Считаем непрочитанные (не от нас)
            unread = chat.messages.filter(is_read=False).exclude(sender=request.user).count()
            is_typing = profile.typing_in == chat.id

            chats_data.append({
                'id': chat.id,
                'name': other_user.first_name or other_user.username,
                'avatar_url': profile.get_avatar_url,
                'last_message': last_message.text if last_message else 'Нет сообщений',
                'time': localtime(last_message.created_at).strftime('%H:%M') if last_message else '',
                'unread': unread,  # <-- КРИТИЧНО ДЛЯ JS
                'timestamp': last_message.created_at.timestamp() if last_message else 0,
                'is_online': profile.is_online(),
                'is_typing': is_typing,
                'status_text': 'online' if profile.is_online() else 'офлайн'
            })

    chats_data.sort(key=lambda x: x['timestamp'], reverse=True)
    return JsonResponse({'status': 'ok', 'chats': chats_data})

@login_required
def create_folder(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        color = request.POST.get('color', '#3b82f6')  # Получаем цвет
        chat_ids = request.POST.getlist('chat_ids[]')

        if not name:
            return JsonResponse({'status': 'error', 'message': 'Название обязательно'})

        # Создаем папку с цветом
        folder = Folder.objects.create(user=request.user, name=name, color=color)

        if chat_ids:
            folder.chats.add(*chat_ids)

        return JsonResponse({'status': 'ok', 'folder_id': folder.id})


# И заодно обновим выдачу папок, чтобы она отдавала цвет и SVG
@login_required
def get_folders_list(request):
    folders = request.user.folders.all()
    data = []
    for f in folders:
        # Генерируем SVG прямо здесь с нужным цветом
        svg_icon = f'''<svg viewBox="0 0 24 24" width="22" height="22" fill="{f.color}"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>'''
        data.append({'id': f.id, 'name': f.name, 'icon': svg_icon})

    return JsonResponse({'status': 'ok', 'folders': data})


@login_required
def get_chats_for_folder_manager(request):
    """Отдает список всех чатов для модалки создания папки (с галочками)"""
    user_chats = request.user.chats.all()
    chats_data = []

    for chat in user_chats:
        other_user = chat.participants.exclude(id=request.user.id).first()
        if other_user:
            chats_data.append({
                'id': chat.id,
                'name': other_user.first_name or other_user.username,
            })

    return JsonResponse({'status': 'ok', 'chats': chats_data})