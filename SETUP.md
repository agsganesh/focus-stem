# Focus Stem on Netlify: Gmail sign-in and friends

The site has two parts. `index.html` is the app. `netlify/functions/api.mjs` is a small Netlify function that checks Google sign-ins and stores players, friends, competitions and reviews in Netlify Blobs. Both are free on Netlify's starter plan.

## 1. Create the Google OAuth client ID (about 5 minutes)

1. Open https://console.cloud.google.com/apis/credentials and pick (or create) a project.
2. If it asks you to set up the **OAuth consent screen** (also called **Google Auth Platform > Branding**), do that first:
   - App name: Focus Stem. Support email: your Gmail.
   - Audience: **External**.
   - Under **Audience**, click **Publish app** so anyone with Gmail can sign in. While it's in "Testing", only test users you list can sign in.
3. Back on **Credentials**, click **Create credentials > OAuth client ID**.
   - Application type: **Web application**. Name: Focus Stem web.
   - **Authorized JavaScript origins**: add `https://focus-stem.netlify.app`. Add `http://localhost:8888` too if you'll test locally.
   - You don't need any redirect URIs.
4. Click **Create** and copy the **Client ID**. It ends in `.apps.googleusercontent.com`, and it's public, not a secret.

## 2. Client ID (done)

The client ID is already in `index.html` and in the function. Optionally, in Netlify **Site configuration > Environment variables**, add `OWNER_EMAIL` with your Gmail address so you can remove other people's reviews.

## 3. Deploy the whole folder

The function needs Netlify to install `@netlify/blobs`, so drag-and-drop of index.html alone isn't enough. Pick one:

- **GitHub (easiest to keep updated):** put this folder's contents in your `focus-stem` repo, then in Netlify use **Add new site > Import from Git** (or link the existing site to the repo). Netlify builds it on every push.
- **Netlify CLI:** in this folder, run `npm install`, then `npx netlify-cli deploy --prod` and choose the focus-stem site.

## How it works for people

- **Send in Gmail** (Friends tab) opens a Gmail draft to the address you type. The draft has a link like `https://focus-stem.netlify.app/?join=<your id>#about`.
- Your friend opens it, lands on About, and taps **Sign in with Google**. They're added as your friend and taken to Friends.
- You see them on `https://focus-stem.netlify.app/#friends` within about 20 seconds, or right away after a refresh.
