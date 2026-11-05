# Som da Família

Player web de música para a família Basso — PWA instalável no celular (tema escuro, mobile-first).

**Não usa** marca, logo, nome nem catálogo do Spotify. As faixas são exemplos gratuitos do [SoundHelix](https://www.soundhelix.com/examples/mp3/).

## Rodar localmente

```bash
cd app-musica-familia
python3 -m http.server 8080
```

Abra no celular (mesma Wi‑Fi): `http://<IP-do-computador>:8080`  
No navegador: menu → **Adicionar à tela inicial**.

## Publicar no GitHub Pages (permanente, sem login no app)

1. Crie um repositório **público** vazio no GitHub (ex.: `som-da-familia`).
2. Envie os arquivos desta pasta para a branch `main`.
3. Em Settings → Pages → Source: Deploy from branch `main` / root (ou `/docs`).
4. URL ficará: `https://<seu-usuario>.github.io/som-da-familia/`

O arquivo `.nojekyll` já está incluído.

## Funcionalidades

- PWA (manifest + service worker)
- Player fixo: play/pause, anterior, próxima, barra de progresso
- Biblioteca, busca, favoritos
- Playlists criáveis (localStorage)
- Perfis simples da família (localStorage)
- Tela **Créditos** com licenças

## Músicas e licenças

12 faixas SoundHelix Song 1–12 — exemplos gratuitos de demonstração disponibilizados em soundhelix.com. Detalhes na tela Créditos do app.
