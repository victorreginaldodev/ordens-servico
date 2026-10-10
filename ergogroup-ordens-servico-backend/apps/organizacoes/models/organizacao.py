from django.db import models


class Organizacao(models.Model):
    nome = models.CharField(max_length=150)
    razao_social = models.CharField(max_length=200, blank=True, default='')
    cnpj = models.CharField(max_length=18, blank=True, default='')
    inscricao_estadual = models.CharField(max_length=30, blank=True, default='')
    inscricao_municipal = models.CharField(max_length=30, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    telefone = models.CharField(max_length=20, blank=True, default='')
    site = models.CharField(max_length=200, blank=True, default='')
    cep = models.CharField(max_length=9, blank=True, default='')
    logradouro = models.CharField(max_length=200, blank=True, default='')
    numero = models.CharField(max_length=20, blank=True, default='')
    complemento = models.CharField(max_length=100, blank=True, default='')
    bairro = models.CharField(max_length=100, blank=True, default='')
    cidade = models.CharField(max_length=100, blank=True, default='')
    uf = models.CharField(max_length=2, blank=True, default='')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Organização'
        verbose_name_plural = 'Organizações'

    def __str__(self):
        return self.nome
