import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  ...(existsSync("/usr/bin/chromium")
    ? { executablePath: "/usr/bin/chromium" }
    : {}),
  args: ["--no-sandbox"],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1120 } });
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://localhost:3000";
try {
  await page.goto(base);
  await page.locator(".post-card").first().waitFor();
  assert.equal(await page.locator("#feed .post-card").count(), 12);
  await page.getByRole("button", { name: "Daha fazla göster" }).click();
  assert.equal(await page.locator("#feed .post-card").count(), 14);
  await page.getByRole("button", { name: "Seyahat", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll("#feed .post-card").length === 3,
  );
  assert.equal(
    await page.locator("#feed .post-category").first().textContent(),
    "Seyahat",
  );
  await page.getByRole("button", { name: "Tümü", exact: true }).click();
  await page.locator("#search").fill("BİRAZ");
  await page.locator("#search").press("Enter");
  await page.waitForFunction(
    () => document.querySelectorAll("#feed .post-card").length === 1,
  );
  assert.match(await page.locator("#feed h3").textContent(), /Biraz/);
  await page.locator("#search").fill("bulunmayacak-bir-baslik");
  await page.locator("#search").press("Enter");
  await page.getByText("Burada henüz bir hikâye yok").waitFor();
  await page
    .getByRole("button", { name: "Blogları keşfet", exact: true })
    .click();
  await page.locator(".blog-card").first().waitFor();
  assert.equal(await page.locator(".blog-card").count(), 4);
  await page.goto(`${base}/@deniz-yilmaz`);
  await page.locator(".blog-intro h1").waitFor();
  assert.match(await page.title(), /Deniz Yılmaz/);
  await page.locator(".post-card h3 a").first().click();
  await page.locator(".article-content h2").first().waitFor();
  assert.match(await page.title(), /Biraz yavaşlamak/);
  await page.goto(`${base}/@yok-boyle-biri`);
  await page.getByText("Bu köşeyi bulamadık").waitFor();
  await page.goto(`${base}/panel.html`);
  await page
    .getByRole("button", { name: "Tema ve renkler", exact: true })
    .click();
  await page.locator(".preset").first().waitFor();
  assert.equal(await page.locator(".preset").count(), 6);
  await page.getByRole("button", { name: "Gece", exact: true }).click();
  assert.equal(
    await page
      .locator("#theme-preview")
      .evaluate((n) => n.style.getPropertyValue("--renk-arkaplan")),
    "#16130F",
  );
  await page.locator("#color-yazi").evaluate((n) => {
    n.value = "#16130f";
    n.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByText(/Kontrast düşük/).waitFor();
  await page.getByRole("button", { name: "Kum", exact: true }).click();
  await page
    .locator("#panel-theme")
    .getByRole("button", { name: "Mobil", exact: true })
    .click();
  assert.ok(
    await page
      .locator("#theme-preview")
      .evaluate((n) => n.classList.contains("mobile")),
  );
  await page.screenshot({
    path: "artifacts/kosem-temalar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sayfa düzeni", exact: true }).click();
  await page.locator("#add-block-type").selectOption("metin_kutusu");
  await page.getByRole("button", { name: "+ Ekle", exact: true }).click();
  assert.equal(await page.locator(".block-item").count(), 4);
  const block = page.locator(".block-item").last();
  await block.getByLabel("Başlık", { exact: true }).fill("Küçük notlar");
  await block
    .getByLabel("Metin", { exact: true })
    .fill("<img src=x onerror=alert(1)> Merhaba köşem");
  assert.equal(await page.locator("#layout-preview .text-box img").count(), 0);
  assert.match(
    await page.locator("#layout-preview .text-box").textContent(),
    /onerror/,
  );
  await block
    .getByRole("button", { name: "Metin kutusu bloğunu yukarı taşı" })
    .click();
  assert.match(
    await page.locator(".block-item").nth(2).textContent(),
    /Metin kutusu/,
  );
  await page.screenshot({ path: "artifacts/kosem-duzen.png", fullPage: true });
  await page.goto(`${base}/editor.html`);
  await page.locator("#post-title").fill("Bir fincan kahvenin yanında");
  await page
    .locator("#post-content")
    .fill(
      '## Güvenli başlık\n\n<script>window.injected=true</script>\n<img src=x onerror="window.injected=true">\n[tehlike](javascript:alert(1))\n\n**Merhaba Köşem**',
    );
  await page.getByRole("button", { name: "Önizleme", exact: true }).click();
  await page.locator("#editor-preview h2").waitFor();
  assert.equal(
    await page
      .locator(
        '#editor-preview script, #editor-preview [onerror], #editor-preview a[href^="javascript:"]',
      )
      .count(),
    0,
  );
  assert.equal(await page.evaluate(() => window.injected), undefined);
  await page.goto(`${base}/giris.html`);
  await page.getByLabel("E-posta adresi").fill("deniz@example.com");
  await page.getByLabel("Şifre", { exact: true }).fill("guvenli-sifre");
  await page
    .locator("#auth-form")
    .getByRole("button", { name: "Giriş yap", exact: true })
    .click();
  await page
    .locator("#toast")
    .getByText(/Firebase bağlantısı/)
    .waitFor();
  await page.goto(base);
  await page.getByRole("button", { name: "Koyu görünüm", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-tema"), "koyu");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-tema"), "koyu");
  await page.locator(".post-card").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "artifacts/kosem-koyu.png" });
  await page.getByRole("button", { name: "Açık görünüm", exact: true }).click();
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/panel.html",
      "/editor.html",
      "/@deniz-yilmaz",
      "/kayit.html",
    ]) {
      await page.goto(base + route);
      await page.locator("#main").waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, `${route}: ${width}px yatay taşma`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1120 });
  await page.goto(base);
  await page.locator(".post-card").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "artifacts/kosem-masaustu.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/kosem-mobil.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Tarayıcı: akış, arama, sayfalama, temalar, bloklar, Markdown temizleme ve responsive kontrolleri geçti.",
  );
} finally {
  await browser.close();
}
