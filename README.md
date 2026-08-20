# DeskVerse

Escritório virtual gamificado com avatares pixel-art, WebSocket em tempo real e videochamada via Jitsi.

## Pré-requisitos

- Node.js 20+
- Docker

## Como rodar

1. Suba o banco de dados:
   ```sh
   docker compose up postgres -d
   ```

2. Instale as dependências:
   ```sh
   npm run install:all
   ```

3. Inicie cliente e servidor:
   ```sh
   npm run dev
   ```

Acesse em **http://localhost:3000** (cliente) e **http://localhost:4000** (servidor).

## Variáveis de ambiente

O arquivo `.env` na raiz já vem pré-configurado para desenvolvimento local. Para habilitar OAuth e Spotify, preencha as variáveis abaixo e registre os redirect URIs correspondentes:

| Variável | Serviço |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login com Google |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Login com GitHub |
| `VITE_SPOTIFY_CLIENT_ID` | Spotify na Sala de Música |

Redirect URIs:
- Google: `http://localhost:4000/auth/google/callback`
- GitHub: `http://localhost:4000/auth/github/callback`
- Spotify: `http://localhost:3000/spotify-callback`
