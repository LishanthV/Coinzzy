# Coinzy — Personal Finance Tracker

Coinzy is a local-first personal finance mobile app built with Expo and TypeScript. It focuses on simple bookkeeping, budgeting, and visual insights while keeping data on-device by default. The project includes a lightweight self-hosted auth helper server for sending email OTPs.

## Key Features
- Onboarding, passwordless sign-up / login via email OTP
- Dashboard with balance, income vs expense visualization, and recent transactions
- Add, edit, delete transactions (expense, income, transfer)
- Transaction history with day grouping and filter by type/category
- Budgets per category with monthly tracking and progress indicators
- Statistics: category breakdown, monthly income vs expense charts
- CSV export and share via native sharing sheet

## Architecture & Design
- Local-first: app state persists to device storage (AsyncStorage) via `zustand`.
- Modular screens and components under `src/screens` and `src/components`.
- Small Express server (optional) used to send OTP emails for passwordless auth (`/server`).
- Designed so cloud sync (Supabase or other) can be added later by adapting the store layer.

## Tech Stack
- Framework: Expo (see `package.json` for exact SDK) — React Native + TypeScript
- Language: TypeScript
- State: `zustand` + AsyncStorage
- Navigation: React Navigation (native stack + bottom tabs)
- Charts: Custom SVG (`react-native-svg`)

## Getting started (mobile app)
1. Install dependencies:

```bash
npm install
```

2. Start the Expo dev server:

```bash
npm run start
# or
npx expo start
```

3. Open the project in Expo Go (scan QR) or run on simulator/emulator:

```bash
npm run android
npm run ios
```

## Running the optional auth server
The `server/` folder contains a small Express app that sends verification OTPs via Gmail SMTP. This is optional — the mobile app will still run in local fallback mode without it.

1. Install server deps and create a `.env` in `server/`:

```env
# server/.env.example
PORT=5000
GMAIL_USER=your.email@gmail.com
GMAIL_PASS=your_gmail_app_password
```

2. Install and start the server:

```bash
cd server
npm install
npm start
```

Notes: `GMAIL_PASS` should be a Gmail App Password (16-character) if using Gmail. If credentials are missing, the server logs the generated OTP so development still works.

## Project structure
See the main app layout under `src/`:

```
src/
  components/   ui.tsx · finance.tsx · charts.tsx
  data/         seedData.ts
  navigation/   RootNavigator.tsx · MainNavigator.tsx · types.ts
  screens/      auth / onboarding / dashboard / history / statistics / budgets / settings / transactions
  store/        useAuthStore.ts · useFinanceStore.ts
  theme/        index.ts
  types/        index.ts
  utils/        format.ts · supabase.ts · notifications.ts
```

## Contributing
- Report issues or propose features via the GitHub repo issues.
- Follow existing code style (TypeScript, functional React components, no large external chart libs).
- Small PRs with tests / screenshots are appreciated.

## License
This project is provided under the terms in [LICENSE](LICENSE).

---
If you'd like, I can initialize a local commit for this project and/or create a remote GitHub repository and push the code — tell me whether you want me to create the remote and provide a repository name or give me an existing remote URL.
