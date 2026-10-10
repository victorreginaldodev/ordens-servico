# Seguranca da documentacao da API

## Objetivo

Fechar uma exposicao publica involuntaria da documentacao da API.

## O problema

`drf-spectacular` libera as rotas de Swagger, Redoc e schema com `AllowAny`
por padrao, ignorando o `IsAuthenticated` global configurado no projeto.
Qualquer pessoa sem autenticacao conseguia ver a estrutura completa da API
(`/api/schema/`, `/api/schema/swagger-ui/`, `/api/schema/redoc/`).

## O que mudou

Essas rotas passaram a exigir Basic Auth explicitamente — em vez de herdar
JWT/sessao, o que faria o navegador nao mostrar nenhuma caixa de login
nativa. Com Basic Auth, o navegador exibe o prompt padrao ao abrir a
documentacao.

## Impacto

Qualquer script ou integracao que consumia o schema pela rota HTTP
(`/api/schema.yaml`, Swagger UI, Redoc) sem autenticacao passa a receber 401
e precisa enviar credenciais (Basic Auth). O comando `manage.py spectacular`
nao e afetado — ele gera o schema direto a partir do codigo, sem passar pela
view HTTP, e continua funcionando sem autenticacao.
