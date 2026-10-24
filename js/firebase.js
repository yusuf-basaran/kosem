export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
export const isConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);
let connection;
export function connect() {
  if (!isConfigured)
    throw Error(
      "Firebase bağlantısı henüz kurulmadı. README içindeki kurulum adımlarını tamamlayın.",
    );
  return (connection ??= (async () => {
    const [appSdk, authSdk, dbSdk, storageSdk] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"),
      import(
        "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
      ),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js"),
    ]);
    const app = appSdk.initializeApp(firebaseConfig);
    return {
      auth: authSdk.getAuth(app),
      db: dbSdk.getFirestore(app),
      storage: storageSdk.getStorage(app),
      authSdk,
      dbSdk,
      storageSdk,
    };
  })());
}
