from django.urls import path
from django.contrib import admin
from chat.views import *
from django.conf import settings # <--- Импортировать
from django.conf.urls.static import static # <--- Импортировать

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index_view, name='home'),                     # Главная: http://127.0.0.1:8000/
    path('login/', login_view, name='login'),              # Вход: http://127.0.0.1:8000/login/
    path('register/', register_view, name='register'),     # Регистрация: http://127.0.0.1:8000/register/
    path('forgot-password/', forgot_password_view, name='forgot_password'), # Сброс пароля
    path('chat/', messenger_view, name='chat'),            # Мессенджер: http://127.0.0.1:8000/chat/
    path('logout/', logout_view, name='logout'),
    path('api/update-avatar/', update_avatar, name='update_avatar'),
    path('api/update-profile/', update_profile, name='update_profile'),
    path('api/search/', search_view, name='search_view'),
    path('api/get-chat/<int:user_id>/', get_or_create_chat, name='get_or_create_chat'),
    path('api/messages/<int:chat_id>/', get_messages, name='get_messages'),
    path('api/send-message/', send_message, name='send_message'),
    path('api/mark-read/<int:chat_id>/', mark_as_read, name='mark_as_read'),
    path('api/ping/', ping_user, name='ping_user'),
    path('api/set-typing/', set_typing, name='set_typing'),
    path('api/delete-message/<int:message_id>/', delete_message, name='delete_message'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)