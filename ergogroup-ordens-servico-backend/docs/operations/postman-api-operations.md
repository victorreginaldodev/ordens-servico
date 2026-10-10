# Operations - Requisicoes via Postman

## Objetivo

Este documento define o pacote operacional para executar requisicoes da API do projeto Ergogroup OS pelo Postman em ambiente de desenvolvimento e producao.

O pacote cobre:

- ambientes Postman para `dev` e `prod`;
- fluxo de autenticacao JWT;
- importacao da especificacao OpenAPI;
- variaveis recomendadas;
- exemplos de chamadas principais;
- checklist de validacao antes de testar operacoes sensiveis.

---

## Bases da API

| Ambiente | Base URL | Observacao |
|---|---|---|
| Dev local | `http://127.0.0.1:8000` | Requer backend Django rodando localmente. |
| Prod principal | `https://www.ergogroupapp.com` | Base usada pelo frontend em producao. |
| Prod alternativa | `https://os.ergogroupapp.com` | Tambem responde a documentacao OpenAPI. |

Endpoints de documentacao:

| Recurso | URL |
|---|---|
| Schema OpenAPI | `{{base_url}}/api/schema/` |
| Swagger UI | `{{base_url}}/api/schema/swagger-ui/` |
| Redoc | `{{base_url}}/api/schema/redoc/` |

Arquivo local da especificacao:

```txt
documentation/api/schema_v1.yaml
```

---

## Estrutura sugerida do pacote

No Postman, organize a collection desta forma:

```txt
Ergogroup OS API
|-- 00 - Auth
|   |-- Login
|   |-- Refresh token
|   |-- Me
|   `-- Logout
|-- 01 - Contas
|-- 02 - Clientes
|-- 03 - Ordens de Servico
|-- 04 - Servicos
|-- 05 - Tarefas e Mini-OS
|-- 06 - Analise
`-- 07 - Auditoria
```

Crie tambem dois environments:

```txt
Ergogroup OS - Dev
Ergogroup OS - Prod
```

---

## Variaveis do environment

### Dev

| Variavel | Valor |
|---|---|
| `base_url` | `http://127.0.0.1:8000` |
| `email` | e-mail do usuario de dev |
| `password` | senha do usuario de dev |
| `access_token` | preenchido automaticamente apos login |
| `refresh_token` | preenchido automaticamente apos login |

### Prod

| Variavel | Valor |
|---|---|
| `base_url` | `https://www.ergogroupapp.com` |
| `email` | e-mail do usuario de producao |
| `password` | senha do usuario de producao |
| `access_token` | preenchido automaticamente apos login |
| `refresh_token` | preenchido automaticamente apos login |

Evite salvar credenciais reais em arquivos versionados. No Postman, prefira manter `email`, `password`, `access_token` e `refresh_token` apenas como valores locais do environment.

---

## Autenticacao

A API usa JWT via `Authorization: Bearer <token>`.

Configure a collection com:

| Campo | Valor |
|---|---|
| Type | `Bearer Token` |
| Token | `{{access_token}}` |

As rotas de login e refresh usam `AllowAny`; as demais rotas exigem usuario autenticado, salvo excecoes futuras documentadas no schema.

---

## Operacao 1 - Login

```txt
POST {{base_url}}/api/contas/auth/login/
Content-Type: application/json
```

Body:

```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```

Resposta esperada:

```json
{
  "access": "...",
  "refresh": "...",
  "usuario": {
    "id": 1,
    "email": "usuario@dominio.com",
    "username": "usuario",
    "nome_completo": "Nome do Usuario",
    "tipo_usuario": "admin",
    "tipo_usuario_display": "Administrador",
    "ativo": true,
    "is_staff": false,
    "is_superuser": false
  }
}
```

Script em `Tests`:

```js
const json = pm.response.json();

pm.environment.set("access_token", json.access);
pm.environment.set("refresh_token", json.refresh);
```

---

## Operacao 2 - Refresh token

```txt
POST {{base_url}}/api/contas/auth/refresh/
Content-Type: application/json
```

Body:

```json
{
  "refresh": "{{refresh_token}}"
}
```

Script em `Tests`:

```js
const json = pm.response.json();

if (json.access) {
  pm.environment.set("access_token", json.access);
}

if (json.refresh) {
  pm.environment.set("refresh_token", json.refresh);
}
```

Observacao: a configuracao do backend usa rotacao de refresh token. Quando a resposta trouxer novo `refresh`, substitua o valor anterior.

---

## Operacao 3 - Usuario autenticado

```txt
GET {{base_url}}/api/contas/auth/me/
Authorization: Bearer {{access_token}}
```

Use esta chamada para validar se o token esta valido e se o environment selecionado aponta para o ambiente correto.

---

## Operacao 4 - Logout

```txt
POST {{base_url}}/api/contas/auth/logout/
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

Body:

```json
{
  "refresh": "{{refresh_token}}"
}
```

Resposta esperada:

```txt
204 No Content
```

Depois do logout, limpe `access_token` e `refresh_token` no environment caso continue testando manualmente.

---

## Importacao OpenAPI no Postman

Opcao recomendada:

1. Abra o Postman.
2. Clique em `Import`.
3. Escolha `Link`.
4. Informe `{{base_url}}/api/schema/` substituindo pelo dominio real do ambiente.
5. Importe como collection.
6. Configure a collection importada para usar `{{base_url}}` e `Bearer {{access_token}}`.

Para importacao local, use:

```txt
documentation/api/schema_v1.yaml
```

---

## Endpoints principais

### Auth e usuarios

| Metodo | Rota |
|---|---|
| `POST` | `/api/contas/auth/login/` |
| `POST` | `/api/contas/auth/refresh/` |
| `GET` | `/api/contas/auth/me/` |
| `POST` | `/api/contas/auth/logout/` |
| `GET` | `/api/contas/usuarios/` |
| `POST` | `/api/contas/usuarios/` |
| `GET` | `/api/contas/usuarios/{id}/` |
| `PATCH` | `/api/contas/usuarios/{id}/alterar-senha/` |
| `PATCH` | `/api/contas/usuarios/{id}/ativar/` |
| `PATCH` | `/api/contas/usuarios/{id}/desativar/` |
| `GET` | `/api/contas/usuarios/tipos/` |

### Clientes

| Metodo | Rota |
|---|---|
| `GET` | `/api/clientes/clientes/` |
| `POST` | `/api/clientes/clientes/` |
| `GET` | `/api/clientes/clientes/{id}/` |
| `PUT` | `/api/clientes/clientes/{id}/` |
| `PATCH` | `/api/clientes/clientes/{id}/` |
| `DELETE` | `/api/clientes/clientes/{id}/` |

### Ordens de servico

| Metodo | Rota |
|---|---|
| `GET` | `/api/ordem-servico/ordens/` |
| `POST` | `/api/ordem-servico/ordens/` |
| `GET` | `/api/ordem-servico/ordens/{id}/` |
| `PUT` | `/api/ordem-servico/ordens/{id}/` |
| `PATCH` | `/api/ordem-servico/ordens/{id}/` |
| `DELETE` | `/api/ordem-servico/ordens/{id}/` |
| `PATCH` | `/api/ordem-servico/ordens/{id}/faturar/` |
| `GET` | `/api/ordem-servico/ordens/{id}/liberada-faturamento/` |

### Servicos

| Metodo | Rota |
|---|---|
| `GET` | `/api/servicos/repositorios/` |
| `POST` | `/api/servicos/repositorios/` |
| `GET` | `/api/servicos/repositorios/{id}/` |
| `GET` | `/api/servicos/subitens-repositorio/` |
| `POST` | `/api/servicos/subitens-repositorio/` |
| `GET` | `/api/servicos/servicos/` |
| `POST` | `/api/servicos/servicos/` |
| `GET` | `/api/servicos/servicos/{id}/` |
| `PATCH` | `/api/servicos/servicos/{id}/` |
| `POST` | `/api/servicos/servicos/{id}/sincronizar/` |

### Tarefas e Mini-OS

| Metodo | Rota |
|---|---|
| `GET` | `/api/tarefas/repositorios/` |
| `POST` | `/api/tarefas/repositorios/` |
| `GET` | `/api/tarefas/tarefas/` |
| `POST` | `/api/tarefas/tarefas/` |
| `GET` | `/api/tarefas/tarefas/{id}/` |
| `PATCH` | `/api/tarefas/tarefas/{id}/` |
| `GET` | `/api/tarefas/mini-os/` |
| `POST` | `/api/tarefas/mini-os/` |
| `GET` | `/api/tarefas/mini-os/{id}/` |
| `PATCH` | `/api/tarefas/mini-os/{id}/` |
| `PATCH` | `/api/tarefas/mini-os/{id}/faturar/` |

### Analise

| Metodo | Rota |
|---|---|
| `GET` | `/api/analise/dados/` |
| `GET` | `/api/analise/financeiro/kpis/` |
| `GET` | `/api/analise/produtividade/` |

### Auditoria

| Metodo | Rota |
|---|---|
| `GET` | `/api/auditoria/registros/` |
| `GET` | `/api/auditoria/registros/{id}/` |
| `GET` | `/api/auditoria/registros/mini-os/{mini_os_id}/timeline/` |
| `GET` | `/api/auditoria/registros/ordens/{ordem_servico_id}/timeline/` |

---

## Checklist antes de testar em producao

- Confirmar se o environment selecionado e `Ergogroup OS - Prod`.
- Conferir se `base_url` aponta para o dominio correto.
- Fazer login com usuario autorizado para o cenario.
- Validar token com `GET /api/contas/auth/me/`.
- Evitar `POST`, `PATCH`, `PUT` e `DELETE` em dados reais sem uma ordem de teste definida.
- Conferir permissoes do usuario antes de testar rotas financeiras.
- Preferir requests `GET` para validacao inicial.
- Registrar IDs alterados quando testar faturamento, liberacao, status ou exclusao.

---

## Checklist para dev local

Para subir o backend local:

```powershell
cd C:\Users\victo\Trabalho\ergogroup\os\ergogroup-ordens-servico-backend
.\.venv\Scripts\Activate.ps1
$env:DJANGO_ENV = "dev"
python manage.py runserver 127.0.0.1:8000
```

Depois valide:

```txt
GET http://127.0.0.1:8000/api/schema/
```

Se a resposta for `200`, o environment `Ergogroup OS - Dev` esta pronto para uso.

---

## Erros comuns

| Sintoma | Causa provavel | Acao |
|---|---|---|
| `401 Unauthorized` | Token ausente, expirado ou invalido. | Execute login ou refresh token. |
| `403 Forbidden` | Usuario sem permissao para a operacao. | Validar perfil do usuario. |
| `404 Not Found` | Rota, ID ou base URL incorreta. | Conferir `base_url` e path no schema. |
| `400 Bad Request` | Body invalido ou campo obrigatorio ausente. | Conferir schema da rota no Swagger/Redoc. |
| Falha de conexao em dev | Backend local parado. | Rodar `python manage.py runserver 127.0.0.1:8000`. |

---

## Referencias tecnicas

- Backend: `config/urls.py`
- Autenticacao: `apps/contas/authentication/views.py`
- Serializers de auth: `apps/contas/authentication/serializers.py`
- Configuracao REST/JWT: `config/settings.py`
- Schema OpenAPI local: `documentation/api/schema_v1.yaml`
- Cliente HTTP do frontend: `src/services/api.ts`
