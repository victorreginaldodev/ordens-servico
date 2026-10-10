"""Definição dos vínculos (setor + função) de um usuário, com as mesmas proteções da API de vínculos."""
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from apps.organizacoes.models import MembroSetor
from apps.organizacoes.permissoes import pode_conceder


def validar_vinculos(itens, por):
    """``itens``: lista de ``{'setor': Setor, 'funcao': Funcao}``. Levanta ``ValidationError`` se a lista
    for inconsistente e ``PermissionDenied`` se ``por`` não puder conceder alguma função."""
    if len(itens) > 1:
        raise ValidationError('Um usuário pertence a um único setor: informe no máximo um vínculo.')
    for item in itens:
        MembroSetor(setor=item['setor'], funcao=item['funcao']).clean()
        if not pode_conceder(por, item['funcao'].codigos_permissao, item['setor']):
            raise PermissionDenied(
                f'Você não pode atribuir a função "{item["funcao"]}" no setor "{item["setor"]}".'
            )


@transaction.atomic
def definir_vinculos(usuario, itens, por):
    """Substitui os vínculos do usuário pelos informados. Quem altera precisa poder conceder tanto as
    funções novas quanto as que estão sendo removidas ou trocadas."""
    validar_vinculos(itens, por)
    desejados = {item['setor'].pk: item['funcao'] for item in itens}

    for vinculo in MembroSetor.objects.filter(usuario=usuario).select_related('setor', 'funcao'):
        funcao_desejada = desejados.pop(vinculo.setor_id, None)
        if funcao_desejada == vinculo.funcao:
            continue
        if not pode_conceder(por, vinculo.funcao.codigos_permissao, vinculo.setor):
            raise PermissionDenied(f'Você não pode alterar o vínculo de {usuario} no setor "{vinculo.setor}".')
        if funcao_desejada is None:
            vinculo.delete()
        else:
            vinculo.funcao = funcao_desejada
            vinculo.save(update_fields=['funcao', 'atualizado_em'])

    for setor_id, funcao in desejados.items():
        MembroSetor.objects.create(usuario=usuario, setor_id=setor_id, funcao=funcao)

    usuario.__dict__.pop('_perfil_de_acesso', None)
