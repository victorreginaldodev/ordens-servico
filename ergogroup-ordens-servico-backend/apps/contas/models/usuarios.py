from django.db import models
from django.contrib.auth.models import AbstractUser


class Usuario(AbstractUser):
    email = models.EmailField(unique=True)
    nome_completo = models.CharField(max_length=255)
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nome_completo']

    def __str__(self):
        return self.email