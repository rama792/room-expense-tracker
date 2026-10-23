# Roomie — Room Expense Tracker

A React + JavaScript web app for roommates to record individual spending. It does **not** split bills or calculate who owes whom.

## Features
- Create a room and share a randomly generated invite code.
- Join a room with the code; no phone number or separate password form.
- Firebase anonymous authentication quietly gives each browser a unique UID.
- Add an expense with item, amount, category and date.
- Real-time shared expenses and member totals through Cloud Firestore.
- Demo mode works locally before Firebase is configured.
- Firestore security rules restrict expense reads to room members and expense creation to the authenticated payer.

## 1. Requirements
- Node.js 18+ (20+ recommended)
- A Google account for Firebase Console

## 2. Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite. Before Firebase is configured, the app is a local demo. Demo entries are not shared with other devices.

## 3. Set up Firebase (no custom backend server)
1. Open https://console.firebase.google.com/ and create a project.
2. In Project settings → General → Your apps, add a Web app and copy its Firebase config.
3. Replace the placeholder values in `src/firebase.js`.
4. In Firebase Console → Authentication → Sign-in method, enable **Anonymous**.
5. In Build → Firestore Database, create a database.
6. Open Firestore Rules and publish the contents of `firestore.rules`.
7. Run the app again. Create a room, then send the invite code to roommates. Each roommate opens the same deployed web app, enters their name and the code, and joins.

## 4. Deploy to Vercel
1. Push this folder to your own GitHub repository.
2. Import the repository into Vercel.
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
4. After deploying, share the Vercel URL and room invite code with roommates.

Firebase web config is expected to be visible in the client. **Firestore Rules are the security boundary**, not hiding the config.

## Room-code security note
The invite code acts like a bearer invitation. This starter generates 8 characters from a restricted alphabet (about 40 bits of randomness). Share it only with your roommates. For stronger production security, use a longer invite token, expiration/rotation, rate limiting through a trusted service, or require an authenticated member to approve new joiners. A code-only room cannot robustly prove who a real-world person is; anyone who obtains the code can join.

## Data model
```text
rooms/{roomCode}
  name, createdBy, createdAt
rooms/{roomCode}/members/{firebaseUid}
  name, joinedAt, role
rooms/{roomCode}/expenses/{expenseId}
  title, amount, category, date, payerUid, payerName, createdAt
```

## Notes
- Anonymous Firebase identity is per browser/app installation. Clearing browser data or switching devices can create a new identity. This app intentionally does not ask for phone numbers or passwords.
- Current UI loads the latest 200 expenses.
- Each roommate's contribution is calculated from expenses whose `payerUid` matches their Firebase UID.
- The app is a starter project; test Firestore rules in the Firebase Emulator before using it for important records.
