import { connect, isConfigured } from "./firebase.js";
import { DEFAULT_THEME, DEFAULT_LAYOUT, validUsername } from "./validation.js";
let currentPromise;
export async function currentUser() {
  if (!isConfigured) return null;
  return (currentPromise ??= connect().then(
    ({ auth, authSdk }) =>
      new Promise((resolve) => {
        const off = authSdk.onAuthStateChanged(auth, (user) => {
          off();
          resolve(user);
        });
      }),
  ));
}
export async function requireUser() {
  const user = await currentUser();
  if (!user && isConfigured) {
    location.replace("/giris.html");
    throw Error("Devam etmek için giriş yapın.");
  }
  return user;
}
export async function signIn(email, password) {
  const { auth, authSdk } = await connect();
  await authSdk.signInWithEmailAndPassword(auth, email, password);
  currentPromise = undefined;
}
export async function signOut() {
  const { auth, authSdk } = await connect();
  await authSdk.signOut(auth);
  currentPromise = undefined;
  location.assign("/");
}
export async function resetPassword(email) {
  const { auth, authSdk } = await connect();
  await authSdk.sendPasswordResetEmail(auth, email);
}
export async function register({ email, password, username, displayName }) {
  if (!validUsername(username))
    throw Error(
      "Kullanıcı adı 3–20 karakter olmalı; küçük harf, rakam ve tire içerebilir. Bu ad ayrılmış da olabilir.",
    );
  if (!displayName.trim() || displayName.trim().length > 80)
    throw Error("Adınız 1–80 karakter olmalı.");
  if (password.length < 8) throw Error("Şifreniz en az 8 karakter olmalı.");
  const { auth, authSdk, db, dbSdk: s } = await connect();
  const result = await authSdk.createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  try {
    await s.runTransaction(db, async (tx) => {
      const handle = s.doc(db, "usernames", username);
      if ((await tx.get(handle)).exists())
        throw Error("Bu kullanıcı adı alınmış. Başka bir ad seçin.");
      tx.set(s.doc(db, "users", result.user.uid), {
        username,
        displayName: displayName.trim(),
        bio: "",
        avatarUrl: "",
        coverUrl: "",
        theme: DEFAULT_THEME,
        layout: DEFAULT_LAYOUT,
        layoutMode: "tek",
        createdAt: s.serverTimestamp(),
      });
      tx.set(handle, { uid: result.user.uid });
    });
  } catch (e) {
    // Kesinleşmeyen bir işlemde önce sunucudaki sonucu kontrol et.
    try {
      const saved = await s.getDocFromServer(
        s.doc(db, "users", result.user.uid),
      );
      if (saved.exists()) {
        currentPromise = undefined;
        return result.user;
      }
      await authSdk.deleteUser(result.user);
    } catch {
      throw Error(
        "Hesap kaydı doğrulanamadı. Aynı e-posta ile giriş yapıp profil kaydını kontrol edin; işlemi tekrarlamayın.",
      );
    }
    throw e;
  }
  currentPromise = undefined;
  return result.user;
}
