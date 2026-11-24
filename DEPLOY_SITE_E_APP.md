# Guia de Lançamento Oficial — PATOFOOT 2026 (Site, Web, Google Play e App Store)

Tudo no projeto já está pré-configurado para você publicar o site com domínio próprio e lançar o aplicativo oficial para Android e iPhone.

---

## 1. Publicar o Site de Verdade com Domínio Próprio

### Opção A — Direto no Google Cloud Run (mais rápida)
1. Clique em **Deploy / Implantar** aqui no AI Studio para subir a versão de produção no **Google Cloud Run**.
2. Compre seu domínio (ex.: `patofoot.com.br` no Registro.br ou Cloudflare).
3. No Google Cloud Console → **Cloud Run** → selecione seu serviço → aba **Mapeamentos de domínio** → conecte o seu domínio e adicione os registros DNS indicados.
4. Defina a variável de ambiente `APP_URL=https://seu-dominio.com.br` no serviço. O servidor atualiza automaticamente o `/sitemap.xml` e `/robots.txt` para o seu domínio oficial.

### Opção B — Via GitHub + Render ou Railway
1. Envie este projeto para um repositório no GitHub.
2. No **Render** (`render.yaml` já incluso) ou **Railway** (`railway.json` já incluso), importe o repositório — os comandos `npm run build`, `npm start` e o healthcheck `/api/health` já são reconhecidos automaticamente.
3. Conecte seu domínio próprio no painel da hospedagem e defina `APP_URL=https://seu-dominio.com.br`.

### Obrigatório após conectar o domínio próprio (Firebase Login)
No **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**, adicione o seu domínio (ex.: `patofoot.com.br` e `www.patofoot.com.br`) para manter o login funcionando sem bloqueios.

---

## 2. Publicar na Google Play Store (Android) — Jeito Mais Rápido (PWABuilder / TWA)

O jogo já possui Manifest PWA, ícones 192px/512px/maskable, Service Worker offline e o arquivo `/.well-known/assetlinks.json` pronto.

1. Com o seu site já no ar em HTTPS, acesse **https://www.pwabuilder.com/** e cole a URL do seu site.
2. Clique em **Package for Stores** → **Android** → preencha o Package ID `com.patofoot.manager2026` e baixe o pacote pronto (`.aab` + `assetlinks.json`).
3. Copie a impressão digital **SHA-256** gerada (ou a SHA-256 da aba *Integridade do App* na Google Play Console) e coloque na variável de ambiente do servidor:
   ```
   ANDROID_SHA256_FINGERPRINTS="AA:BB:CC:..."
   ```
   *(Isso libera o app em tela cheia sem barra de navegador no Android sem nem precisar alterar código.)*
4. Suba o arquivo `.aab` na **Google Play Console** (taxa única de US$ 25) e publique.

---

## 3. Publicar como App Nativo no Android e iOS (Play Store + App Store com Capacitor)

O arquivo `capacitor.config.json` já está configurado com o ID `com.patofoot.manager2026`, tema escuro `#020617` e tela de abertura.

No seu computador (com Node.js 20+ instalado), dentro da pasta do projeto baixado:

```bash
# 1. Instalar dependências do projeto e do Capacitor
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# 2. Gerar as pastas nativas (faça apenas uma vez)
npx cap add android
npx cap add ios

# 3. Compilar o jogo e abrir no Android Studio (Android .aab)
npm run mobile:android

# 4. Compilar o jogo e abrir no Xcode em um Mac (iPhone/iPad .ipa)
npm run mobile:ios
```

### Para Universal Links no iPhone (opcional)
Defina no servidor a variável de ambiente:
```
APPLE_TEAM_ID="SEU_TEAM_ID_APPLE"
```
O endpoint `/.well-known/apple-app-site-association` será servido automaticamente em JSON válido para a Apple.
