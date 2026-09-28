# Pacts server (Firebase)

`pacts/index.html` works in two modes:

- **Cloud**: pacts live in Firestore. Links carry a 10-character id
  (`getphonepact.com/pacts/#k7x2m9qa3b`), everyone in a pact sees the same pact,
  signatures included, and people can save their pacts to an email with a
  one-tap link (no password).
- **Local**: no server reachable, for example the design preview. Pacts live in
  the browser and links carry the whole pact (but not signature drawings).

The page uses cloud mode with the project below, or, on `localhost`, the local
emulator when it is running.

## The project

Set up on 28 September 2026. It is a **separate Firebase project from the
PhonePact app** (`phonepact-001`), so pact data never mixes with app users.

- Project `pacts-by-phonepact`, display name "Pacts by PhonePact", on the free
  Spark plan.
- Firestore: the `(default)` database in `nam5` (United States), with delete
  protection on. Its rules are `firestore.rules` in this folder.
- Sign-in: guest (anonymous) and email link (passwordless) are on. Google
  sign-in is off; it was switched on for a moment only to set the public name
  "Pacts by PhonePact" that sign-in emails show. Allowed domains:
  `getphonepact.com` and the project's own `firebaseapp.com` / `web.app`.
- Web app "Pacts web": its public config is `FIREBASE_CONFIG` in
  `pacts/index.html`. These values are public by design; the rules protect the
  data.
- On the Spark plan, Firebase sends at most 5 sign-in link emails a day for the
  whole project, and in testing on 28 September 2026 none arrived at all. So the
  page hides "Save it to your email" (`EMAIL_SIGNIN = false` in
  `pacts/index.html`) until the project has a billing account (the Blaze plan).
  Turn it back on there, then send yourself a test link before telling anyone.

Deploy rule changes with:

```bash
firebase deploy --only firestore:rules --project pacts-by-phonepact --config pacts/firebase/firebase.json
```

Sign-in settings are not in `firebase.json` on purpose: deploying an `auth`
section there turns email links back into password sign-in. Change them in the
Firebase console instead.

## Try it locally

```bash
firebase emulators:start --only auth,firestore --project demo-pacts --config pacts/firebase/firebase.json
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://localhost:8765/pacts/`. To play the friend, open the same link on
`http://127.0.0.1:8765/pacts/`, which is a separate browser origin and therefore
a separate person. Sign-in emails are not sent by the emulator; the page shows a
"test link" button instead. With the emulator stopped, `localhost` uses the real
project, so keep the emulator running while you test.
