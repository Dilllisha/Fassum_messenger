from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from .models import *
from django.db.models import Q
from django.utils import timezone
from django.utils.timezone import localtime
from django.templatetags.static import static

# Главная страница (Лендинг)
def index_view(request):
    return render(request, 'main_page.html')

# Страницы авторизации
def login_view(request):
    if request.method == 'POST':
        # Забираем то, что ввел пользователь
        login_val = request.POST.get('username')
        password_val = request.POST.get('password')

        # Если в логине есть '@', значит это почта. Ищем юзера по email.
        if '@' in login_val:
            try:
                user_obj = User.objects.get(email=login_val)
                login_val = user_obj.username # Подменяем email на реальный тег для проверки
            except User.DoesNotExist:
                pass # Если такой почты нет, просто идем дальше (выдаст ошибку ниже)

        # Проверяем (сверяем хэш пароля с базой)
        user = authenticate(request, username=login_val, password=password_val)

        if user is not None:
            # Успешно! Создаем сессию
            login(request, user)
            return redirect('chat') # Перекидываем в мессенджер
        else:
            # Ошибка! Возвращаем форму с сообщением
            return render(request, 'login.html', {'error_message': 'Неверный логин или пароль!'})

    # Обычный заход на страницу
    return render(request, 'login.html')


def register_view(request):
    if request.method == 'POST':
        # Теперь получаем оба значения
        first_name = request.POST.get('first_name')  # Красивое имя (Данила)
        user_name = request.POST.get('username')  # Технический тег (danila)

        user_email = request.POST.get('email')
        user_password = request.POST.get('password')
        confirm_password = request.POST.get('confirmPassword')

        if user_password != confirm_password:
            return render(request, 'register.html', {'error_message': 'Пароли не совпадают!'})

        if User.objects.filter(username=user_name).exists():
            return render(request, 'register.html', {'error_message': 'Этот тег уже занят, придумайте другой!'})

        # Создаем пользователя
        user = User.objects.create_user(username=user_name, email=user_email, password=user_password)
        # Сохраняем отображаемое Имя
        user.first_name = first_name
        user.save()

        return redirect('login')

    return render(request, 'register.html')

    # Если пользователь просто зашел на страницу (GET запрос) - показываем пустую форму
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

        if other_user:
            # ВЫЧИСЛЯЕМ СТАТУС СРАЗУ (БЕЗ ОЖИДАНИЯ JS)
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
                'status_text': status_text,  # Передаем текст в HTML
                'is_online': is_online,  # Передаем флаг для зеленой точки
            })

    return render(request, 'messenger.html', {
        'chats': chats_data,
        'folders': user_folders
    })


@login_required
def update_avatar(request):
    if request.method == 'POST' and request.FILES.get('avatar'):
        try:
            # Используем get_or_create вместо прямого обращения к .profile
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

# Функция для выхода из аккаунта
def logout_view(request):
    logout(request) # Удаляем сессию
    return redirect('login') # Перекидываем на форму входа


# chat/views.py

@login_required
def update_profile(request):
    if request.method == 'POST':
        # Получаем данные из FormData
        first_name = request.POST.get('first_name')
        email = request.POST.get('email')

        user = request.user

        # Обновляем поля
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

    # ЛОГИКА ОБРАБОТКИ @
    search_by_tag = query.startswith('@')
    clean_query = query[1:] if search_by_tag else query

    if search_by_tag:
        # Если есть @, ищем строго по username (тегу)
        users = User.objects.filter(username__icontains=clean_query)
    else:
        # Если нет @, ищем и по имени, и по тегу
        users = User.objects.filter(
            Q(username__icontains=clean_query) | Q(first_name__icontains=clean_query)
        )

    users = users.exclude(id=request.user.id).distinct()

    # Получаем ID тех, с кем УЖЕ есть чат
    existing_chat_users_ids = User.objects.filter(
        chats__participants=request.user
    ).exclude(id=request.user.id).values_list('id', flat=True)

    local_results = []
    global_results = []

    for user in users:
        # Умное получение аватарки
        if hasattr(user, 'profile'):
            avatar_url = user.profile.get_avatar_url
        else:
            avatar_url = static('images/default_avatar.png')

        user_data = {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name or user.username,
            'avatar_url': avatar_url  # JS получит 100% рабочую ссылку!
        }

        # СОРТИРУЕМ: Если он уже есть в чатах - в local, иначе - в global
        if user.id in existing_chat_users_ids:
            local_results.append(user_data)
        else:
            global_results.append(user_data)

    # ВОЗВРАЩАЕМ ИМЕННО local И global ДЛЯ JS
    return JsonResponse({
        'status': 'ok',
        'local': local_results,
        'global': global_results
    })


@login_required
def get_or_create_chat(request, user_id):
    try:
        other_user = User.objects.get(id=user_id)

        # Ищем существующий чат между текущим юзером и выбранным
        chat = Chat.objects.filter(participants=request.user).filter(participants=other_user).first()

        if not chat:
            # Если чата нет — создаем новый
            chat = Chat.objects.create()
            chat.participants.add(request.user, other_user)
            is_new = True
        else:
            is_new = False

        # Безопасное получение "умной" ссылки на аватарку
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
                'avatar_url': avatar_url  # Передаем правильную ссылку фронтенду
            }
        })
    except User.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Пользователь не найден'}, status=404)


# chat/views.py

# chat/views.py

@login_required
def get_messages(request, chat_id):
    # 1. Защита от ошибки конвертации last_id
    try:
        last_id = int(request.GET.get('last_id', 0))
    except (ValueError, TypeError):
        last_id = 0

    try:
        chat = Chat.objects.get(id=chat_id, participants=request.user)
        new_msgs = chat.messages.filter(id__gt=last_id).order_by('created_at')

        # Обязательно list(), иначе QuerySet не сериализуется
        read_ids = list(chat.messages.filter(sender=request.user, is_read=True).values_list('id', flat=True))

        # 2. Безопасное получение статуса
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

                    # Логика градации времени
                    if diff < timedelta(hours=24):
                        time_str = localtime(profile.last_seen).strftime('%H:%M')
                        status_text = f"был(а) сегодня в {time_str}"
                    elif diff < timedelta(days=7):
                        status_text = "был(а) на этой неделе"
                    else:
                        status_text = "офлайн"  # Давно не заходил
            except Exception as e:
                print(f"Ошибка статуса: {e}")

                # 3. Безопасная сборка сообщений (всё конвертируем в базовые типы)
        messages_data = []
        for m in new_msgs:
            # Гарантируем, что время станет строкой '14:05', а не объектом datetime
            time_str = localtime(m.created_at).strftime('%H:%M') if m.created_at else ''

            messages_data.append({
                'id': m.id,
                'text': str(m.text) if m.text else '',
                'is_my': bool(m.sender == request.user),  # Принудительно в True/False
                'time': time_str,
                'is_read': bool(m.is_read),
                'image_urls': list([img.image.url for img in m.images.all()])
            })

        is_typing = False
        if other_user and hasattr(other_user, 'profile'):
            # Если у собеседника в поле typing_in записан ID текущего чата
            if other_user.profile.typing_in == int(chat_id):
                is_typing = True

        return JsonResponse({
            'status': 'ok',
            'messages': messages_data,
            'other_user_status': status_text,
            'is_typing': is_typing
        })
    except Chat.DoesNotExist:
        return JsonResponse({'status': 'error'}, status=404)


# chat/views.py

@login_required
def send_message(request):
    if request.method == 'POST':
        chat_id = request.POST.get('chat_id')
        text = request.POST.get('text', '').strip()
        # ПОЛУЧАЕМ СПИСОК ФАЙЛОВ (обрати внимание на getlist и ключ 'images')
        images = request.FILES.getlist('images')

        try:
            chat = Chat.objects.get(id=chat_id, participants=request.user)

            # 1. Создаем одно текстовое сообщение
            message = Message.objects.create(chat=chat, sender=request.user, text=text)

            # 2. Прикрепляем к нему все картинки
            image_urls = []
            for img in images:
                msg_img = MessageImage.objects.create(message=message, image=img)
                image_urls.append(msg_img.image.url)

            return JsonResponse({
                'status': 'ok',
                'message': {
                    'id': message.id,
                    'text': message.text,
                    'image_urls': image_urls,  # Теперь это массив!
                    'time': message.created_at.strftime('%H:%M'),
                    'is_read': False
                }
            })
        except Chat.DoesNotExist:
            return JsonResponse({'status': 'error'}, status=404)

@login_required
def mark_as_read(request, chat_id):
    try:
        chat = Chat.objects.get(id=chat_id, participants=request.user)
        # Находим сообщения в этом чате, которые:
        # 1. Еще не прочитаны (is_read=False)
        # 2. Отправлены НЕ текущим пользователем (exclude sender=request.user)
        unread_messages = chat.messages.filter(is_read=False).exclude(sender=request.user)

        count = unread_messages.count()
        unread_messages.update(is_read=True)  # Массово обновляем статус

        return JsonResponse({'status': 'ok', 'marked_count': count})
    except Chat.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Чат не найден'}, status=404)

@login_required
def ping_user(request):
    try:
        # Автоматически находим или создаем профиль для себя
        profile, created = Profile.objects.get_or_create(user=request.user)
        profile.last_seen = timezone.now()
        profile.save(update_fields=['last_seen'])
    except Exception as e:
        print(f"Ошибка пинга: {e}")
    return JsonResponse({'status': 'ok'})


@login_required
def set_typing(request):
    chat_id = request.POST.get('chat_id', 0)
    status = request.POST.get('status', 'false')  # 'true' или 'false'

    profile, created = Profile.objects.get_or_create(user=request.user)
    if status == 'true':
        profile.typing_in = int(chat_id)
    else:
        profile.typing_in = 0
    profile.save(update_fields=['typing_in'])
    return JsonResponse({'status': 'ok'})

@login_required
def delete_message(request, message_id):
    if request.method == 'POST':
        try:
            # Разрешаем удалять только свои сообщения
            message = Message.objects.get(id=message_id, sender=request.user)
            message.delete()
            return JsonResponse({'status': 'ok'})
        except Message.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Сообщение не найдено или нет прав'}, status=403)
    return JsonResponse({'status': 'error'}, status=400)