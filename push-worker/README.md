# Mochi Planner push server (Cloudflare Worker)

Sends instant Web Push notifications (iPhone home-screen app, browsers) for friend messages and class nudges.
Free Cloudflare plan, no credit card.

1. Cloudflare dashboard → Workers & Pages → Create → Create Worker → name it `mochi-push` → Deploy.
2. Edit code → replace everything with `worker.js` from this folder → Deploy.
3. Settings → Variables and Secrets → Add → Type **Secret**, name `VAPID_PRIVATE`, value = the private key you were given → Deploy.
4. Open the worker URL: it should show `"ready":true`.
5. Put the worker URL in `www/js/config.js` → `PUSH.url`.

The matching public key is already in `worker.js` and `www/js/config.js`. Never commit the private key.
