// Focus Stem API: Google sign-in check plus a small document store in Netlify Blobs.
// Everyone signed in can read players, comps and reviews; each person writes only their own doc.
import { getStore } from "@netlify/blobs";

// The OAuth web client ID from Google Cloud. It's public; GOOGLE_CLIENT_ID in Netlify overrides it.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "261400203231-absiu53t54ghqpebc3294iivq2apl90d.apps.googleusercontent.com";
// Gmail address of the site owner, who may remove other people's reviews. Set OWNER_EMAIL in Netlify.
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "").toLowerCase();
const COLLECTIONS = ["players", "comps", "reviews"];
const MAX_BYTES = 200000;
const verified = new Map();

async function signedIn(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token || token === "null") return null;
  const hit = verified.get(token);
  if (hit && hit.exp * 1000 > Date.now()) return hit;
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token));
  if (!r.ok) return null;
  const t = await r.json();
  if (!CLIENT_ID || t.aud !== CLIENT_ID || String(t.email_verified) !== "true") return null;
  if (t.iss !== "accounts.google.com" && t.iss !== "https://accounts.google.com") return null;
  const who = { id: "g" + t.sub, email: (t.email || "").toLowerCase(), name: t.given_name || t.name || "", picture: t.picture || "", exp: +t.exp };
  verified.set(token, who);
  return who;
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function readAll(name) {
  const store = getStore(name);
  const { blobs } = await store.list();
  const docs = {};
  await Promise.all(blobs.map(async b => { const v = await store.get(b.key, { type: "json" }); if (v) docs[b.key] = v; }));
  return docs;
}

export default async req => {
  const who = await signedIn(req);
  if (!who) return json({ error: "Sign in with Google first." }, 401);
  const parts = new URL(req.url).pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const isOwner = !!OWNER_EMAIL && who.email === OWNER_EMAIL;

  if (parts[0] === "me" && req.method === "GET") {
    // Keep a public name and photo for leaderboards. Emails are never shared.
    await getStore("profiles").setJSON(who.id, { name: who.name, avatarUrl: who.picture });
    return json({ id: who.id, name: who.name, picture: who.picture, isOwner });
  }
  if (parts[0] === "c" && req.method === "GET" && (COLLECTIONS.includes(parts[1]) || parts[1] === "profiles")) {
    return json({ docs: await readAll(parts[1]) });
  }
  if (parts[0] === "d" && COLLECTIONS.includes(parts[1]) && parts[2]) {
    const [, coll, id] = parts, store = getStore(coll), mine = id === who.id;
    if (req.method === "GET") { const v = await store.get(id, { type: "json" }); return json({ exists: v != null, data: v }); }
    if (req.method === "PUT") {
      if (!mine) return json({ error: "You can only change your own data." }, 403);
      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: "Too large." }, 413);
      let v; try { v = JSON.parse(text); } catch { return json({ error: "Bad JSON." }, 400); }
      if (!v || typeof v !== "object" || Array.isArray(v)) return json({ error: "Bad document." }, 400);
      await store.setJSON(id, v);
      return json({ ok: true });
    }
    if (req.method === "DELETE") {
      if (!mine && !(isOwner && coll === "reviews")) return json({ error: "You can only remove your own data." }, 403);
      await store.delete(id);
      return json({ ok: true });
    }
  }
  return json({ error: "Not found." }, 404);
};

export const config = { path: "/api/*" };
