import os
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from django.templatetags.static import static

# Модель Чата (Диалога)
class Chat(models.Model):
    # В чате может быть несколько участников (для личных переписок - два)
    participants = models.ManyToManyField(User, related_name='chats')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Красивое отображение в админке
        return f"Чат {self.id}"

# Модель Сообщения
class Message(models.Model):
    chat = models.ForeignKey('Chat', related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"От {self.sender.username}: {self.text[:20]}..."

# Модель для прикрепленных к сообщению картинок
class MessageImage(models.Model):
    message = models.ForeignKey(Message, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='chat_images/')

# Модель Папки
class Folder(models.Model):
    # Владелец папки
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='folders')
    # Название папки (например, "Работа", "Личное")
    name = models.CharField(max_length=50)
    # Чаты, которые лежат в этой папке (может быть пустой)
    chats = models.ManyToManyField(Chat, related_name='folders', blank=True)

    def __str__(self):
        return f"Папка: {self.name} ({self.user.username})"

# ЕДИНСТВЕННАЯ И ПРАВИЛЬНАЯ МОДЕЛЬ ПРОФИЛЯ
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    last_seen = models.DateTimeField(default=timezone.now)
    typing_in = models.IntegerField(default=0)

    # Умное свойство для получения ссылки на аватар
    @property
    def get_avatar_url(self):
        if self.avatar and hasattr(self.avatar, 'url'):
            return self.avatar.url
        # Если картинки нет, отдаем нашу статику
        return static('images/default_avatar.jpg')

    # Метод, который проверяет, был ли юзер активен
    def is_online(self):
        now = timezone.now()
        # ВРЕМЕННО для теста 15 секунд (потом замени на minutes=3)
        return now - self.last_seen < timedelta(seconds=15)


# --- СИГНАЛЫ ДЛЯ АВАТАРОК ---

# 1. Удаление старого файла при загрузке нового
@receiver(pre_save, sender=Profile)
def delete_old_avatar_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return False

    try:
        # Пытаемся достать текущий профиль из БД до сохранения изменений
        old_profile = Profile.objects.get(pk=instance.pk)
    except Profile.DoesNotExist:
        return False

    # Если путь к аватарке в БД не совпадает с тем, что мы сохраняем сейчас
    if old_profile.avatar and old_profile.avatar != instance.avatar:
        # Проверяем, существует ли физически старый файл, и удаляем его
        if os.path.isfile(old_profile.avatar.path):
            os.remove(old_profile.avatar.path)

# 2. Удаление файла, если сам профиль (пользователь) был удален
@receiver(post_delete, sender=Profile)
def delete_avatar_on_profile_delete(sender, instance, **kwargs):
    if instance.avatar:
        if os.path.isfile(instance.avatar.path):
            os.remove(instance.avatar.path)

# 3. Автоматическое создание профиля при регистрации нового пользователя
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

# 4. Сохранение профиля при сохранении пользователя
@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()