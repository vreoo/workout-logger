# Workout Logger (personal)

Offline-only workout logger built with Expo Router + SQLite.

## Local dev

```bash
npm install
npx expo start --tunnel   # scan with Expo Go or a dev build
```

## EAS builds (minimal)

1. Install CLI and sign in:

```bash
npm install -g eas-cli
eas login
```

2. Development build (best for your own device):

```bash
eas build --profile development --platform ios     # or android
```

3. Install the build on your phone (QR/link from EAS) and start Metro:

```bash
npx expo start --tunnel
```

Open the dev build app and connect to the project.

4. Standalone build (no Metro required after install):

```bash
eas build --profile production --platform ios      # App Store/adhoc/internal
eas build --profile production --platform android  # AAB; for a quick APK use --profile preview
```

Install from the EAS build page/store link. The JS bundle is embedded, so the app runs without your laptop once installed.

## Data backup

Data lives locally in `workouts.db`. Use in-app export (Exercises/History) or copy the DB file from your device if you want a backup.
