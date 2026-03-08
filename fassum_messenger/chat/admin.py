from django.contrib import admin
from .models import *

admin.site.register(Chat)
admin.site.register(Message)
admin.site.register(Folder)
admin.site.register(MessageImage)
admin.site.register(Profile)