import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { DEFAULT_THEME, DEFAULT_LAYOUT } from "../js/validation.js";
let env;
const user = (username, name = username) => ({
  username,
  displayName: name,
  bio: "",
  avatarUrl: "",
  coverUrl: "",
  theme: DEFAULT_THEME,
  layout: DEFAULT_LAYOUT,
  layoutMode: "tek",
  createdAt: new Date(),
});
const author = (uid) => env.authenticatedContext(uid).firestore();
async function signup(uid, name) {
  const db = author(uid);
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`usernames/${name}`);
    const found = await tx.get(ref);
    if (found.exists) throw Error("taken");
    tx.set(db.doc(`users/${uid}`), { ...user(name), createdAt: timestamp() });
    tx.set(ref, { uid });
  });
}
let timestamp;
const post = (uid, changes = {}) => ({
  authorId: uid,
  authorUsername: uid,
  authorName: uid,
  title: "Bir köşe",
  titleLower: "bir köşe",
  slug: "bir-kose-0123456789abcdef",
  content: "Yazı içeriği",
  excerpt: "Kısa açıklama",
  coverUrl: "",
  category: "Yaşam",
  status: "published",
  publishedAt: timestamp(),
  createdAt: timestamp(),
  updatedAt: timestamp(),
  ...changes,
});
before(async () => {
  const firebase = await import("firebase/compat/app");
  await import("firebase/compat/firestore");
  timestamp = () => firebase.default.firestore.FieldValue.serverTimestamp();
  env = await initializeTestEnvironment({
    projectId: "demo-kosem",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
    storage: { rules: await readFile("storage.rules", "utf8") },
  });
  await env.clearFirestore();
  await signup("alice", "alice");
  await signup("bob", "bob");
  await author("alice").doc("posts/public").set(post("alice"));
  await author("alice")
    .doc("posts/draft")
    .set(post("alice", { status: "draft", publishedAt: null }));
});
after(async () => {
  await env?.cleanup();
});
test("kayıt kullanıcı adı ile profilin atomik yazılmasını gerektirir", async () => {
  await assertFails(
    author("carol")
      .doc("users/carol")
      .set({ ...user("carol"), createdAt: timestamp() }),
  );
  await assertFails(
    author("carol").doc("usernames/carol").set({ uid: "carol" }),
  );
  await signup("carol", "carol");
});
test("aynı kullanıcı adı eşzamanlı işlemlerde bir kez alınır", async () => {
  const results = await Promise.allSettled([
    signup("race-one", "shared-name"),
    signup("race-two", "shared-name"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});
test("kullanıcı adı başkasına geçirilemez, değiştirilemez ve silinemez", async () => {
  await assertFails(author("bob").doc("usernames/alice").set({ uid: "bob" }));
  await assertFails(author("alice").doc("usernames/alice").delete());
  await assertFails(
    author("alice").doc("users/alice").update({ username: "new-name" }),
  );
});
test("profil alanları, tema, bloklar ve rezerv adlar korunur", async () => {
  const db = author("alice");
  await assertFails(
    author("bob").doc("users/alice").update({ bio: "başkası" }),
  );
  await assertFails(db.doc("users/alice").update({ role: "admin" }));
  await assertFails(db.doc("users/alice").update({ "theme.css": "body{}" }));
  await assertFails(db.doc("users/alice").update({ "theme.font": "evil" }));
  await assertFails(
    db.doc("users/alice").update({ "theme.renkler.vurgu": "red" }),
  );
  await assertFails(
    db
      .doc("users/alice")
      .update({
        layout: [
          {
            id: "a",
            tip: "metin_kutusu",
            ayar: {
              gorunur: true,
              genislik: "tam",
              baslik: "",
              metin: "x".repeat(2001),
            },
          },
        ],
      }),
  );
  await assertFails(
    db.doc("users/alice").update({ layout: Array(9).fill(DEFAULT_LAYOUT[0]) }),
  );
  await assertFails(signup("reserved", "admin"));
  await assertSucceeds(
    db.doc("users/alice").update({ bio: "Kendime ait notlar" }),
  );
});
test("yayın herkese, taslak sadece sahibine açıktır", async () => {
  const guest = env.unauthenticatedContext().firestore();
  await assertSucceeds(guest.doc("posts/public").get());
  await assertFails(guest.doc("posts/draft").get());
  await assertFails(author("bob").doc("posts/draft").get());
  await assertSucceeds(author("alice").doc("posts/draft").get());
  await assertSucceeds(
    guest
      .collection("posts")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(12)
      .get(),
  );
  await assertFails(guest.collection("posts").limit(12).get());
  await assertFails(
    guest
      .collection("posts")
      .where("status", "==", "published")
      .limit(13)
      .get(),
  );
});
test("sadece sahip düzenler; yazar kimliği, alanlar ve zamanlar korunur", async () => {
  const db = author("alice");
  await assertFails(
    author("bob")
      .doc("posts/public")
      .update({ title: "çalıntı", updatedAt: timestamp() }),
  );
  await assertFails(
    db.doc("posts/public").update({ authorId: "bob", updatedAt: timestamp() }),
  );
  await assertFails(
    db
      .doc("posts/public")
      .update({ slug: "baska-0123456789abcdef", updatedAt: timestamp() }),
  );
  await assertFails(
    db
      .doc("posts/public")
      .update({ title: "a".repeat(161), updatedAt: timestamp() }),
  );
  await assertFails(
    db
      .doc("posts/public")
      .update({ content: "a".repeat(100001), updatedAt: timestamp() }),
  );
  await assertFails(
    db
      .doc("posts/public")
      .update({ html: "<script/>", updatedAt: timestamp() }),
  );
  await assertFails(
    author("bob")
      .doc("posts/spoofed")
      .set(post("bob", { authorUsername: "alice" })),
  );
  await assertSucceeds(
    db
      .doc("posts/draft")
      .update({
        status: "published",
        publishedAt: timestamp(),
        updatedAt: timestamp(),
      }),
  );
  await assertSucceeds(
    db.doc("posts/draft").update({ status: "draft", updatedAt: timestamp() }),
  );
  await assertFails(author("bob").doc("posts/public").delete());
});
test("tüm blok türleri ve 8 blok sınırı kurallardan geçer", async () => {
  const blocks = [
    ...DEFAULT_LAYOUT,
    {
      id: "b4",
      tip: "one_cikan_yazi",
      ayar: { gorunur: true, genislik: "yarim", postId: "" },
    },
    {
      id: "b5",
      tip: "metin_kutusu",
      ayar: { gorunur: true, genislik: "tam", baslik: "Not", metin: "Merhaba" },
    },
    {
      id: "b6",
      tip: "sosyal_baglantilar",
      ayar: {
        gorunur: true,
        genislik: "yarim",
        website: "https://example.com",
        instagram: "",
        github: "",
        linkedin: "",
      },
    },
    { id: "b7", tip: "kategoriler", ayar: { gorunur: true, genislik: "tam" } },
  ];
  await assertSucceeds(
    author("alice").doc("users/alice").update({ layout: blocks }),
  );
  await assertFails(
    author("alice")
      .doc("users/alice")
      .update({
        layout: [
          {
            ...blocks[5],
            ayar: { ...blocks[5].ayar, website: "javascript:alert(1)" },
          },
        ],
      }),
  );
  const twelve = Array.from({ length: 8 }, (_, i) => ({
    ...DEFAULT_LAYOUT[0],
    id: `id-${i}`,
  }));
  await assertSucceeds(
    author("alice").doc("users/alice").update({ layout: twelve }),
  );
  const socials = Array.from({ length: 8 }, (_, i) => ({
    ...blocks[5],
    id: `social-${i}`,
  }));
  await assertSucceeds(
    author("alice").doc("users/alice").update({ layout: socials }),
  );
  for (const template of blocks) {
    const eight = Array.from({ length: 8 }, (_, i) => ({
      ...template,
      id: `block-${i}`,
    }));
    await assertSucceeds(
      author("alice").doc("users/alice").update({ layout: eight }),
    );
  }
  await assertFails(
    author("alice")
      .doc("users/alice")
      .update({ layout: [null] }),
  );
});
test("Storage klasör sahipliği, MIME, boyut ve silme yetkisi", async () => {
  const a = env.authenticatedContext("alice").storage(),
    b = env.authenticatedContext("bob").storage(),
    guest = env.unauthenticatedContext().storage();
  await assertSucceeds(
    a
      .ref("avatars/alice/photo.png")
      .put(new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" }),
  );
  await assertFails(
    b
      .ref("avatars/alice/other.png")
      .put(new Uint8Array(10), { contentType: "image/png" }),
  );
  await assertFails(
    guest
      .ref("covers/alice/other.png")
      .put(new Uint8Array(10), { contentType: "image/png" }),
  );
  await assertFails(
    a
      .ref("covers/alice/large.png")
      .put(new Uint8Array(2097153), { contentType: "image/png" }),
  );
  await assertFails(
    a
      .ref("covers/alice/script.svg")
      .put(new Uint8Array(10), { contentType: "image/svg+xml" }),
  );
  await assertFails(
    a
      .ref("unknown/alice/file.png")
      .put(new Uint8Array(10), { contentType: "image/png" }),
  );
  await assertSucceeds(guest.ref("avatars/alice/photo.png").getDownloadURL());
  await assertFails(b.ref("avatars/alice/photo.png").delete());
  await assertSucceeds(a.ref("avatars/alice/photo.png").delete());
});
