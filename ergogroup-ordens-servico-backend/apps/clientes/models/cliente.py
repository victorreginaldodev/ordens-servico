from django.db import models


class TipoInscricao(models.TextChoices):
    CNPJ = 'cnpj', 'CNPJ'
    CPF = 'cpf', 'CPF'
    CEI = 'cei', 'CEI'
    CNO = 'cno', 'CNO'
    CAEPF = 'caepf', 'CAEPF'


class TipoCliente(models.TextChoices):
    GESTAO = 'gestao', 'Gestão'
    AVULSO = 'avulso', 'Avulso'
    FORNECEDOR = 'fornecedor', 'Fornecedor'


class Cliente(models.Model):
    nome = models.CharField(max_length=100)
    tipo_inscricao = models.CharField(max_length=10, choices=TipoInscricao.choices, default=TipoInscricao.CNPJ, null=True, blank=True)
    numero_inscricao = models.CharField(max_length=30, null=True, blank=True)
    tipo_cliente = models.CharField(max_length=10, choices=TipoCliente.choices, default=TipoCliente.GESTAO, null=True, blank=True)
    observacao = models.TextField(null=True, blank=True)
    nome_representante = models.CharField(max_length=50, null=True, blank=True)
    setor_representante = models.CharField(max_length=50, null=True, blank=True)
    email_representante = models.EmailField(null=True, blank=True)
    contato_representante = models.CharField(max_length=50, null=True, blank=True)
    cobranca_revisao_alteracao = models.BooleanField(default=True)
    ativo = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'

    def __str__(self):
        return self.nome
