import { connect, isConfigured } from "./firebase.js";
import { demoUsers, demoPosts } from "./demo.js";
import {
  validateTheme,
  validateLayout,
  LAYOUT_MODES,
  validatePost,
  validateImage,
  normalizeTitle,
  slugify,
} from "./validation.js";
const profileCache = new Map();
const unpack = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
export async function getProfile(uid) {
  if (profileCache.has(uid)) return profileCache.get(uid);
  if (!isConfigured) return demoUsers.find((u) => u.id === uid) || null;
  const { db, dbSdk: s } = await connect();
  const d = await s.getDoc(s.doc(db, "users", uid));
  const data = d.exists() ? { id: d.id, ...d.data() } : null;
  if (data) profileCache.set(uid, data);
  return data;
}
export async function getBlog(username) {
  if (!isConfigured)
    return demoUsers.find((u) => u.username === username) || null;
  const { db, dbSdk: s } = await connect();
  const d = await s.getDoc(s.doc(db, "usernames", username));
  return d.exists() ? getProfile(d.data().uid) : null;
}
export async function listBlogs(cursor = null) {
  if (!isConfigured)
    return {
      items: cursor ? [] : demoUsers,
      cursor: demoUsers.length,
      hasMore: false,
    };
  const { db, dbSdk: s } = await connect();
  const q = [s.orderBy("createdAt", "desc"), s.limit(12)];
  if (cursor) q.push(s.startAfter(cursor));
  const snap = await s.getDocs(s.query(s.collection(db, "users"), ...q));
  const items = unpack(snap);
  items.forEach((u) => profileCache.set(u.id, u));
  return { items, cursor: snap.docs.at(-1), hasMore: items.length === 12 };
}
export async function listPosts({
  cursor = null,
  category = "",
  search = "",
  authorId = "",
  owner = false,
} = {}) {
  if (!isConfigured) {
    let items = demoPosts.filter(
      (p) =>
        (!category || p.category === category) &&
        (!search || p.titleLower.startsWith(normalizeTitle(search))) &&
        (!authorId || p.authorId === authorId),
    );
    const offset = cursor || 0;
    return {
      items: items.slice(offset, offset + 12),
      cursor: offset + 12,
      hasMore: items.length > offset + 12,
    };
  }
  const { db, dbSdk: s } = await connect();
  const parts = [];
  if (!owner) parts.push(s.where("status", "==", "published"));
  if (authorId) parts.push(s.where("authorId", "==", authorId));
  if (category) parts.push(s.where("category", "==", category));
  if (search) {
    const term = normalizeTitle(search);
    parts.push(
      s.where("titleLower", ">=", term),
      s.where("titleLower", "<=", term + "\uf8ff"),
      s.orderBy("titleLower"),
      s.orderBy("publishedAt", "desc"),
    );
  } else parts.push(s.orderBy(owner ? "updatedAt" : "publishedAt", "desc"));
  if (cursor) parts.push(s.startAfter(cursor));
  parts.push(s.limit(12));
  const snap = await s.getDocs(s.query(s.collection(db, "posts"), ...parts));
  return {
    items: unpack(snap),
    cursor: snap.docs.at(-1),
    hasMore: snap.size === 12,
  };
}
export async function getPost(id) {
  if (!isConfigured) return demoPosts.find((p) => p.id === id) || null;
  const { db, dbSdk: s } = await connect();
  const d = await s.getDoc(s.doc(db, "posts", id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}
export async function getPostBySlug(username, slug) {
  if (!isConfigured)
    return (
      demoPosts.find((p) => p.authorUsername === username && p.slug === slug) ||
      null
    );
  const { db, dbSdk: s } = await connect();
  const snap = await s.getDocs(
    s.query(
      s.collection(db, "posts"),
      s.where("authorUsername", "==", username),
      s.where("slug", "==", slug),
      s.where("status", "==", "published"),
      s.limit(1),
    ),
  );
  return unpack(snap)[0] || null;
}
export async function saveProfile(uid, changes) {
  if (changes.theme && !validateTheme(changes.theme))
    throw Error("Tema seçenekleri geçersiz.");
  if (changes.layout && !validateLayout(changes.layout))
    throw Error("Blok düzeni geçersiz.");
  if (changes.layoutMode && !LAYOUT_MODES.includes(changes.layoutMode))
    throw Error("Sayfa düzeni geçersiz.");
  const { db, dbSdk: s } = await connect();
  await s.updateDoc(s.doc(db, "users", uid), changes);
  profileCache.delete(uid);
}
export async function uploadImage(uid, folder, file) {
  validateImage(file);
  if (!["avatars", "covers"].includes(folder))
    throw Error("Görsel klasörü geçersiz.");
  const { storage, storageSdk: s } = await connect();
  const ext = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  }[file.type];
  const target = s.ref(
    storage,
    `${folder}/${uid}/${crypto.randomUUID()}.${ext}`,
  );
  await s.uploadBytes(target, file, { contentType: file.type });
  return s.getDownloadURL(target);
}
export async function removeUploadedImage(url) {
  const { storage, storageSdk: s } = await connect();
  try {
    await s.deleteObject(s.ref(storage, url));
  } catch (e) {
    if (e.code !== "storage/object-not-found") throw e;
  }
}
export async function savePost(user, profile, data, id) {
  validatePost(data);
  const { db, dbSdk: s } = await connect();
  const author = {
    authorId: user.uid,
    authorUsername: profile.username,
    authorName: profile.displayName,
  };
  if (id) {
    const target = s.doc(db, "posts", id);
    await s.runTransaction(db, async (tx) => {
      const snap = await tx.get(target);
      if (!snap.exists() || snap.data().authorId !== user.uid)
        throw Error("Bu yazıyı düzenleme yetkiniz yok.");
      const old = snap.data();
      tx.update(target, {
        ...data,
        titleLower: normalizeTitle(data.title),
        authorName: profile.displayName,
        updatedAt: s.serverTimestamp(),
        publishedAt:
          data.status === "published"
            ? old.publishedAt || s.serverTimestamp()
            : old.publishedAt,
      });
    });
    return id;
  }
  const ref = await s.addDoc(s.collection(db, "posts"), {
    ...author,
    ...data,
    titleLower: normalizeTitle(data.title),
    slug: `${slugify(data.title)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    createdAt: s.serverTimestamp(),
    updatedAt: s.serverTimestamp(),
    publishedAt: data.status === "published" ? s.serverTimestamp() : null,
  });
  return ref.id;
}
export async function deletePost(id) {
  const { db, dbSdk: s } = await connect();
  await s.deleteDoc(s.doc(db, "posts", id));
}
