import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_THEME,
  DEFAULT_LAYOUT,
  validateTheme,
  validateLayout,
  validUsername,
  safeUrl,
  slugify,
  normalizeTitle,
  validateImage,
} from "../js/validation.js";
import { PRESETS, themeWarnings } from "../js/tema.js";
test("varsayılanlar ve hazır temalar doğrulanır; kontrast yeterlidir", () => {
  assert.ok(validateTheme(DEFAULT_THEME));
  assert.ok(validateLayout(DEFAULT_LAYOUT));
  for (const p of PRESETS) {
    assert.ok(validateTheme(p.theme));
    assert.deepEqual(themeWarnings(p.theme), [], p.name);
  }
});
test("bilinmeyen anahtar, font, renk ve kod reddedilir", () => {
  for (const changes of [
    { css: "body{}" },
    { font: "evil" },
    { mod: "system" },
    { renkler: { ...DEFAULT_THEME.renkler, vurgu: "red" } },
    { renkler: { ...DEFAULT_THEME.renkler, vurgu: "url(javascript:1)" } },
  ])
    assert.equal(validateTheme({ ...DEFAULT_THEME, ...changes }), false);
});
test("blok türleri, boyut, tekrar eden kimlikler ve sosyal adresler doğrulanır", () => {
  assert.equal(validateLayout(Array(9).fill(DEFAULT_LAYOUT[0])), false);
  assert.equal(validateLayout([DEFAULT_LAYOUT[0], DEFAULT_LAYOUT[0]]), false);
  assert.equal(
    validateLayout([
      { id: "x", tip: "html", ayar: { gorunur: true, genislik: "tam" } },
    ]),
    false,
  );
  assert.equal(
    validateLayout([
      {
        id: "x",
        tip: "sosyal_baglantilar",
        ayar: {
          gorunur: true,
          genislik: "tam",
          website: "javascript:alert(1)",
        },
      },
    ]),
    false,
  );
  assert.equal(
    validateLayout([
      {
        id: "x",
        tip: "metin_kutusu",
        ayar: {
          gorunur: true,
          genislik: "tam",
          baslik: "Notlar",
          metin: "<script>alert(1)</script>",
        },
      },
    ]),
    true,
  );
});
test("Türkçe başlıklar tutarlı biçimde aranır ve adreslenir", () => {
  assert.equal(normalizeTitle(" İSTANBUL IŞIK "), "istanbul ışık");
  assert.equal(
    slugify("İçimde Bir Köşe: Çığ & Şehir"),
    "icimde-bir-kose-cig-sehir",
  );
});
test("kullanıcı adları ve bağlantılar beyaz listeye uyar", () => {
  [
    "admin",
    "api",
    "kosem",
    "ab",
    "Deniz",
    "deniz_yilmaz",
    "deniz.abc",
    "köşem",
    "a".repeat(21),
  ].forEach((s) => assert.equal(validUsername(s), false, s));
  assert.ok(validUsername("deniz-yilmaz"));
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("//example.com"), "");
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
test("görseller MIME ve 2 MB sınırı ile doğrulanır", () => {
  assert.doesNotThrow(() =>
    validateImage({ type: "image/jpeg", size: 2097152 }),
  );
  assert.throws(() => validateImage({ type: "image/svg+xml", size: 100 }));
  assert.throws(() => validateImage({ type: "image/png", size: 2097153 }));
});
