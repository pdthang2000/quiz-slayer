# QuizSlayer mobile app

Expo app (React Native, Expo SDK 58). UI only: every rule lives in the API (`apps/api`).

## Before you start (once)
- Node 24: `nvm install` in the repo root (reads `.nvmrc`). Every terminal needs `nvm use`, because the system default is Node 20 and Expo SDK 58 needs Node 22.13 or newer.
- `pnpm install` in the repo root.
- `cp apps/mobile/.env.example apps/mobile/.env` and set `EXPO_PUBLIC_API_URL` (see below). `.env` is not committed.

## 1. Start the API (every time)
```
cd ~/Documents/QuizSlayer
nvm use
docker compose up -d                       # Postgres
pnpm --filter @quizslayer/api start:dev    # API on port 3000
```
Check: `curl http://localhost:3000/health` answers 200.

## 2a. Run in the iOS Simulator on the Mac
```
cd ~/Documents/QuizSlayer/apps/mobile
nvm use
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --ios
```
- Opens the Simulator, installs Expo Go in it (first time only) and loads the app.
- Do not add `--localhost`: Metro then listens on IPv6 only and Expo Go says "Could not connect to the server".
- The first run downloads Expo Go from GitHub. Some networks block GitHub (`curl https://github.com` resets); use another network once, after that it stays installed.
- Shortcuts: Cmd+Shift+H home screen, Cmd+D Expo dev menu, Cmd+Shift+A toggle dark mode (UI-12).

Needs Xcode (Mac App Store) with the iOS Simulator, and once:
```
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
```

## 2b. Run on an iPhone with Expo Go
1. Install **Expo Go** from the App Store. The iPhone must be on the same Wi-Fi as the Mac.
2. Find the Mac's IP: `ipconfig getifaddr en0` (e.g. `192.168.0.2`).
3. Put it in `apps/mobile/.env`: `EXPO_PUBLIC_API_URL=http://192.168.0.2:3000`.
4. Start the app:
   ```
   cd ~/Documents/QuizSlayer/apps/mobile
   nvm use
   pnpm start --clear
   ```
   `--clear` is needed after changing `.env`, because the URL is built into the bundle.
5. Scan the QR code with the iPhone Camera; it opens in Expo Go.

If the app says "Can't reach the server":
- Open `http://<Mac IP>:3000/health` in Safari on the iPhone.
- The Mac's IP changes between networks; repeat steps 2–4.
- Allow Node in macOS System Settings → Network → Firewall.
- If the QR code does not connect at all, try `pnpm start --tunnel`.

## 2c. Local dev build (later)
For native modules that Expo Go lacks: `npx expo run:ios --device` with the iPhone plugged in. Needs Xcode and a free Apple ID; the install expires after 7 days (ADR-006).

## Checks before a commit
```
pnpm --filter @quizslayer/mobile lint
pnpm --filter @quizslayer/mobile typecheck
pnpm --filter @quizslayer/mobile test
```
