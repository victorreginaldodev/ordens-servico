# ordens-servico

Backend (Django) e frontend (React + Vite) do sistema de ordens de serviço.

## Desenvolvimento

Para subir os dois servidores de uma vez, na raiz do projeto:

```
dev.cmd
```

Cada servidor abre na sua própria janela:

- Backend: http://localhost:8000 (`ergogroup-ordens-servico-backend`, usa o `.venv` e o `.env.dev`)
- Frontend: http://localhost:8080 (`ergogroup-ordens-servico-frontend`, usa o `.env.development`)

Antes da primeira vez:

- **Backend:** `python -m venv .venv` e `.venv\Scripts\pip install -r requirements.txt`, e criar o `.env.dev`.
- **Frontend:** `npm install` e criar o `.env.development` com `VITE_API_BASE_URL`.
