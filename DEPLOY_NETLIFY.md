# Deploy do Rest Flow Pro no Netlify

Este projeto ja esta configurado para TanStack Start com SSR, funcoes de servidor e Supabase no Netlify.

## 1. Antes de enviar ao GitHub

O arquivo `.env` e privado e nao deve ser enviado. Use `.env.example` apenas como lista dos nomes necessarios.

Crie um repositorio vazio no GitHub. Depois, abra o terminal dentro desta pasta e execute:

```bash
git init
git add .
git commit -m "Preparar deploy no Netlify"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Se o projeto ja estiver conectado a um repositorio, nao execute `git init` nem adicione outro `origin`: apenas faça commit e push das alteracoes.

## 2. Importar no Netlify

1. Entre em https://app.netlify.com/.
2. Clique em **Add new project**.
3. Selecione **Import an existing project**.
4. Escolha **GitHub**, autorize o acesso e selecione o repositorio.
5. O Netlify deve ler automaticamente `netlify.toml` e mostrar:
   - Build command: `npm run build`
   - Publish directory: `dist/client`
6. Ainda nao publique: primeiro cadastre as variaveis abaixo.

## 3. Cadastrar as variaveis do Supabase

No projeto do Netlify, abra **Project configuration > Environment variables** e crie estas sete variaveis:

```text
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_PROJECT_ID
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Os valores das seis primeiras estao no seu `.env` local. Para obter `SUPABASE_SERVICE_ROLE_KEY`, abra o painel do Supabase e acesse **Project Settings > API Keys**. Copie a chave secreta `service_role`/secret.

Importante: `SUPABASE_SERVICE_ROLE_KEY` e secreta. Nunca use o prefixo `VITE_` nela, nunca coloque essa chave no GitHub e nunca compartilhe uma captura dela.

## 4. Publicar

1. Volte para a tela de deploy e clique em **Deploy**.
2. Aguarde o status **Published**.
3. Abra o endereco gerado pelo Netlify e teste login, tela de funcionario e tela administrativa.

Se voce adicionar as variaveis depois do primeiro deploy, abra **Deploys > Trigger deploy > Deploy site** para gerar uma nova versao.

## 5. Configurar o endereco no Supabase

Depois que o Netlify gerar a URL, abra no Supabase **Authentication > URL Configuration**:

- Em **Site URL**, informe `https://SEU-SITE.netlify.app`.
- Em **Redirect URLs**, adicione `https://SEU-SITE.netlify.app/**`.

Salve e teste novamente o login.

## Atualizacoes futuras

Sempre que voce fizer um novo `git push` na branch `main`, o Netlify fara um novo deploy automaticamente.
