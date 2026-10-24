import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  ...(existsSync("/usr/bin/chromium")
    ? { executablePath: "/usr/bin/chromium" }
    : {}),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  bypassCSP: true,
  viewport: { width: 1360, height: 1000 },
});
let source = await readFile("js/firebase.js", "utf8");
source = source
  .replace(/apiKey:\s*["']["']/, 'apiKey: "demo-key"')
  .replace(/authDomain:\s*["']["']/, 'authDomain: "demo-kosem.firebaseapp.com"')
  .replace(/projectId:\s*["']["']/, 'projectId: "demo-kosem"')
  .replace(
    /storageBucket:\s*["']["']/,
    'storageBucket: "demo-kosem.appspot.com"',
  )
  .replace(/appId:\s*["']["']/, 'appId: "demo-app"');
source = source.replace(
  "const app = appSdk.initializeApp(firebaseConfig);",
  `const app = appSdk.initializeApp(firebaseConfig);
   authSdk.connectAuthEmulator(authSdk.getAuth(app),'http://127.0.0.1:9099',{disableWarnings:true});
   dbSdk.connectFirestoreEmulator(dbSdk.getFirestore(app),'127.0.0.1',8085);
   storageSdk.connectStorageEmulator(storageSdk.getStorage(app),'127.0.0.1',9199);`,
);
await context.route("**/js/firebase.js", (route) =>
  route.fulfill({ contentType: "text/javascript", body: source }),
);
let dataSource = await readFile("js/yazilar.js", "utf8");
dataSource = dataSource.replace(
  "return s.getDownloadURL(target);",
  "return (await s.getDownloadURL(target)).replace('http://127.0.0.1:9199','https://firebasestorage.googleapis.com');",
);
await context.route("**/js/yazilar.js", (route) =>
  route.fulfill({ contentType: "text/javascript", body: dataSource }),
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("Browser:", m.text().slice(0, 200));
});
const suffix = Date.now().toString(36),
  username = `okur-${suffix}`,
  email = `${username}@example.com`,
  password = "Guvenli123!";
const base = "http://localhost:3000";
try {
  await page.goto(base + "/kayit.html");
  await page.getByLabel("Adın ve soyadın").fill("Deniz Okur");
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill(username);
  await page.getByLabel("E-posta adresi").fill(email);
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Blogumu oluştur" }).click();
  await page.waitForURL("**/panel.html", { timeout: 45000 });
  await page.getByRole("heading", { name: "Merhaba, Deniz" }).waitFor();
  console.log("Kayıt: Auth + atomik kullanıcı adı/profil kaydı geçti.");
  await page.getByRole("button", { name: "Profilim", exact: true }).click();
  await page.getByLabel("Görünen ad").fill("Deniz Okur");
  await page
    .getByLabel("Hakkında", { exact: true })
    .fill("Kahve, kitaplar ve pencereden görünen hayat.");
  await page.locator("#avatar-file").setInputFiles("assets/deniz.jpg");
  await page.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
  await page.getByText("Profilin güncellendi.").waitFor({ timeout: 30000 });
  console.log("Profil + Storage avatar yüklemesi geçti.");
  await page.getByRole("link", { name: "+ Yeni yazı" }).click();
  await page.locator("#post-title").fill("İstanbul’da sakin bir sabah");
  await page
    .locator("#post-excerpt")
    .fill("Pencereden görünen hayat üzerine kısa notlar.");
  await page
    .locator("#post-content")
    .fill(
      "## Pencerenin önünde\n\nYeni gün, taze bir kahve.\n\n**Merhaba Köşem.**",
    );
  await page.locator("#post-category").selectOption("Yaşam");
  await page.locator("#post-cover").setInputFiles("assets/coffee.jpg");
  await page
    .getByRole("button", { name: "Taslağı kaydet", exact: true })
    .click();
  await page.getByText("Taslağın kaydedildi.").waitFor({ timeout: 30000 });
  const id = new URL(page.url()).searchParams.get("id");
  assert.ok(id);
  console.log("Taslak + kapak yüklemesi geçti.");
  const guest = await browser.newContext({ bypassCSP: true });
  await guest.route("**/js/firebase.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: source }),
  );
  const visitor = await guest.newPage();
  await visitor.goto(base + `/@${username}`);
  await visitor.getByText("Henüz bir yazı yok").waitFor();
  assert.equal(await visitor.locator(".post-card").count(), 0);
  await page.getByRole("button", { name: "Yayınla", exact: true }).click();
  await page.getByText("Yazın yayınlandı.").waitFor();
  await visitor.reload();
  await visitor.locator(".post-card").first().waitFor();
  await visitor.locator(".post-card h3 a").click();
  await visitor.getByRole("heading", { name: "Pencerenin önünde" }).waitFor();
  assert.match(await visitor.title(), /İstanbul’da sakin bir sabah/);
  console.log(
    "Ziyaretçi taslağı göremiyor; yayınlanan yazı blog ve okuma sayfasında açılıyor.",
  );
  await page.goto(base + "/panel.html");
  await page
    .getByRole("button", { name: "Tema ve renkler", exact: true })
    .click();
  await page.getByRole("button", { name: "Orman", exact: true }).click();
  await page
    .getByRole("button", { name: "Temayı kaydet", exact: true })
    .click();
  await page.getByText("Teman kaydedildi.").waitFor();
  await page.getByRole("button", { name: "Sayfa düzeni", exact: true }).click();
  await page.locator("#add-block-type").selectOption("metin_kutusu");
  await page.getByRole("button", { name: "+ Ekle", exact: true }).click();
  const block = page.locator(".block-item").last();
  await block.getByLabel("Başlık", { exact: true }).fill("Köşemden notlar");
  await block
    .getByLabel("Metin", { exact: true })
    .fill("Her gün yazmak için küçük bir neden.");
  await page
    .getByRole("button", { name: "Düzeni kaydet", exact: true })
    .click();
  await page.getByText("Sayfa düzenin kaydedildi.").waitFor();
  await visitor.goto(base + `/@${username}`);
  await visitor.getByText("Her gün yazmak için küçük bir neden.").waitFor();
  assert.equal(
    await visitor
      .locator("#blog-root")
      .evaluate((n) => n.style.getPropertyValue("--renk-vurgu")),
    "#2F6B3E",
  );
  console.log(
    "Tema ve blok düzeni Firestore’dan ziyaretçi görünümüne taşındı.",
  );
  await page.getByRole("button", { name: "Çıkış yap", exact: true }).click();
  await page.waitForURL(base + "/");
  await page.goto(base + "/panel.html");
  await page.waitForURL("**/giris.html");
  await page.getByLabel("E-posta adresi").fill(email);
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page
    .locator("#auth-form")
    .getByRole("button", { name: "Giriş yap", exact: true })
    .click();
  await page.waitForURL("**/panel.html");
  await page.locator(".my-post").first().waitFor();
  await page.getByRole("button", { name: "Sil", exact: true }).click();
  await page.getByRole("button", { name: "Yazıyı sil", exact: true }).click();
  await page.getByText("Yazı silindi.").waitFor();
  await page.getByText("İlk hikâyen için yer hazır").waitFor();
  console.log("Çıkış, korumalı panel, yeniden giriş ve silme geçti.");
  assert.deepEqual(errors, []);
  await guest.close();
  console.log("Uçtan uca Firebase emülatör akışı başarılı.");
} catch (e) {
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/emulator-error.png",
    fullPage: true,
  });
  console.log("URL:", page.url());
  console.log("Bildirim:", await page.locator("#toast").textContent());
  throw e;
} finally {
  await browser.close();
}
