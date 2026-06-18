# 📚 Biblioteca Paixão Côrtes — Sistema de Gestão

Sistema local de gestão da biblioteca da EMEF João Carlos D'Ávila Paixão Côrtes.
Usa **Google Sheets como banco de dados** — totalmente gratuito.

---

## 💰 Custo: R$ 0,00

- Google Sheets API: gratuita
- OAuth 2.0: gratuito
- Sem cartão de crédito, sem assinatura

---

## ⚙️ Configuração (fazer só uma vez)

### Passo 1 — Ativar a Google Sheets API

1. Acesse https://console.cloud.google.com com `bibliotecapaixaocortes@gmail.com`
2. Selecione ou crie um projeto
3. Menu lateral → **APIs e serviços** → **Biblioteca**
4. Pesquise `Google Sheets API` → **Ativar**

### Passo 2 — Criar credenciais OAuth 2.0

1. Menu lateral → **APIs e serviços** → **Credenciais**
2. **Criar credenciais** → **ID do cliente OAuth 2.0**
3. Tipo: **Aplicativo da Web**
4. Nome: `Biblioteca App`
5. Em **URIs de redirecionamento autorizados**, clique em **Adicionar URI**:
   ```
   http://localhost:3099/callback
   ```
6. Clique em **Criar**
7. Copie o **ID do cliente** e o **Segredo do cliente**

### Passo 3 — Configurar o .env

```
Copie:  backend/.env.example  →  backend/.env
```

Preencha com os valores do passo anterior:
```
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
```

### Passo 4 — Instalar e configurar

**Windows:**
```
Duplo clique em: instalar.bat
```

**Chrome OS:**
```bash
bash instalar.sh
```

### Passo 5 — Iniciar (primeira vez: autoriza o Google)

**Windows:**
```
Duplo clique em: iniciar.bat
```

**Chrome OS:**
```bash
bash iniciar.sh
```

Na **primeira execução**, o Chrome abre automaticamente pedindo permissão.
Faça login com `bibliotecapaixaocortes@gmail.com` e clique em **Permitir**.
Isso acontece **uma única vez** — o token fica salvo em `backend/token.json`.

---

## 🚀 Uso diário

Só clicar em `iniciar.bat` (Windows) ou `bash iniciar.sh` (Chrome OS).
O sistema abre direto em **http://localhost:5173** sem pedir login.

---

## 📴 Modo Offline (funciona sem internet)

A escola tem internet instável, então o sistema continua **100% utilizável mesmo offline**:

- **Leitura:** acervo, alunos e empréstimos são servidos de um **cache local**
  (pasta `backend/cache/`), atualizado a cada acesso com internet.
- **Escrita:** empréstimos, devoluções, renovações e cadastros feitos offline são
  guardados numa **fila local** (`backend/cache/_outbox.json`) e aplicados na tela
  na hora. Quando a internet volta, a fila é **enviada automaticamente** ao Google
  Sheets (a cada ~30s e a cada atualização de tela).
- Uma **faixa no topo** avisa quando está em modo offline e quantas ações estão
  pendentes de sincronização.

**Importante:**
- Conecte à internet **ao menos uma vez** antes do primeiro uso offline (para
  popular o cache).
- A sincronização é **posicional** (usa o número da linha). Evite reorganizar
  linhas da planilha por fora enquanto o app estiver offline com ações pendentes.
- Regra operacional: não registrar empréstimo **e** devolução do mesmo livro no
  mesmo dia enquanto estiver offline.

---

## 🗂️ Planilhas

| Planilha | ID |
|----------|-----|
| Acervo | `1gmajGFZ-j1bptOz7MNf6-IkbZwsHrAePsY1TiJ0Xm_4` |
| Empréstimos | `1CS4Ss3tR6KxxBcV5OjNMImycwX6CvTQ_-MUNKNPmHq0` |

---

## ❓ Problemas Comuns

**"token.json não encontrado"**
→ Rode `node setup.js` dentro da pasta `backend/`

**"invalid_client"**
→ Verifique se o Client ID e Secret estão corretos no `.env`

**"redirect_uri_mismatch"**
→ Confirme que adicionou `http://localhost:3099/callback` nas URIs de redirecionamento

**Tela "App não verificado" no Google**
→ Clique em **"Avançado"** → **"Acessar biblioteca-app (não seguro)"** — isso é normal para apps internos
