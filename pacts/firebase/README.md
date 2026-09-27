# Pacts server (Firebase)

`pacts/index.html` works in two modes:

- **Cloud**: pacts live in Firestore. Links carry a 10-character id
  (`getphonepact.com/pacts/#k7x2m9qa3b`), both people see the same pact, and
  people can save their pacts to an email with a one-tap link (no password).
- **Local**: no server reachable, for example the design preview or before the
  project below exists. Pacts live in the browser and links carry the whole pact.

The page picks cloud mode when `FIREBASE_CONFIG` in `index.html` is filled in,
or, on `localhost`, when the local emulator is running.

This must stay a **separate Firebase project from the PhonePact app**, so pact
data never mixes with app users.

## Try it locally

```bash
firebase emulators:start --only auth,firestore --project demo-pacts --config pacts/firebase/firebase.json
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://localhost:8765/pacts/`. To play the friend, open the same link on
`http://127.0.0.1:8765/pacts/`, which is a separate browser origin and therefore
a separate person. Sign-in emails are not sent by the emulator; the page shows a
"test link" button instead.

## Publish (needs Hank's go-ahead)

1. Create a new Firebase project (not the PhonePact app project).
2. Authentication: enable **Anonymous** and **Email link (passwordless)** sign-in.
3. Authentication → Settings → Authorized domains: add `getphonepact.com`.
4. Create a Firestore database, then deploy the rules:
   `firebase deploy --only firestore:rules --project <project-id> --config pacts/firebase/firebase.json`
5. Register a web app and paste its `apiKey`, `authDomain`, `projectId` and
   `appId` into `FIREBASE_CONFIG` in `pacts/index.html`. These values are public
   by design; the rules above are what protect the data.
