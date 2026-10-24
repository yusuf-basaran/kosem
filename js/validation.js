export const FONTS = [
  "DM Sans",
  "Inter",
  "Lora",
  "Merriweather",
  "Source Serif 4",
  "Literata",
  "Nunito Sans",
  "Work Sans",
  "Libre Baskerville",
];
export const CATEGORIES = [
  "Yaşam",
  "Tasarım",
  "Teknoloji",
  "Kültür & Sanat",
  "Seyahat",
  "Yeme & İçme",
  "Edebiyat",
  "Kişisel",
];
export const RESERVED = [
  "admin",
  "panel",
  "giris",
  "kayit",
  "editor",
  "api",
  "blog",
  "yazi",
  "satir",
  "kosem",
  "destek",
  "settings",
  "auth",
  "www",
  "firebase",
  "assets",
  "css",
  "js",
];
export const DEFAULT_THEME = {
  mod: "acik",
  renkler: {
    arkaplan: "#FAF7F2",
    yazi: "#1F1B16",
    vurgu: "#C2410C",
    kart: "#FFFFFF",
  },
  font: "Inter",
  kose: "yumusak",
  yogunluk: "rahat",
};
export const BLOCK_TYPES = [
  "kapak",
  "hakkimda",
  "yazilar",
  "one_cikan_yazi",
  "kategoriler",
  "sosyal_baglantilar",
  "metin_kutusu",
];
export const LAYOUT_MODES = ["tek", "yan", "iki"];
export const DEFAULT_LAYOUT = [
  { id: "b1", tip: "kapak", ayar: { gorunur: true, genislik: "tam" } },
  { id: "b2", tip: "hakkimda", ayar: { gorunur: true, genislik: "tam" } },
  {
    id: "b3",
    tip: "yazilar",
    ayar: { gorunur: true, genislik: "tam", gorunum: "izgara", sutun: 2 },
  },
];
const exact = (obj, keys) =>
  obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).length === keys.length &&
  keys.every((k) => Object.hasOwn(obj, k));
export const validHex = (value) =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
export const validUsername = (value) =>
  typeof value === "string" &&
  /^[a-z0-9-]{3,20}$/.test(value) &&
  !RESERVED.includes(value);
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !/\s/.test(value) ? u.href : "";
  } catch {
    return "";
  }
}
export function validateTheme(t) {
  return Boolean(
    exact(t, ["mod", "renkler", "font", "kose", "yogunluk"]) &&
      ["acik", "koyu"].includes(t.mod) &&
      FONTS.includes(t.font) &&
      ["keskin", "yumusak", "yuvarlak"].includes(t.kose) &&
      ["rahat", "sikisik"].includes(t.yogunluk) &&
      exact(t.renkler, ["arkaplan", "yazi", "vurgu", "kart"]) &&
      Object.values(t.renkler).every(validHex),
  );
}
const settings = {
  kapak: [],
  hakkimda: [],
  yazilar: ["gorunum", "sutun"],
  one_cikan_yazi: ["postId"],
  kategoriler: [],
  sosyal_baglantilar: ["website", "instagram", "github", "linkedin"],
  metin_kutusu: ["baslik", "metin"],
};
export function validateLayout(layout) {
  return (
    Array.isArray(layout) &&
    layout.length <= 8 &&
    new Set(layout.map((b) => b?.id)).size === layout.length &&
    layout.every((b) => {
      if (
        !exact(b, ["id", "tip", "ayar"]) ||
        typeof b.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,40}$/.test(b.id) ||
        !BLOCK_TYPES.includes(b.tip)
      )
        return false;
      const a = b.ayar;
      if (
        !a ||
        typeof a !== "object" ||
        Array.isArray(a) ||
        Object.keys(a).some(
          (k) => !["gorunur", "genislik", ...settings[b.tip]].includes(k),
        ) ||
        typeof a.gorunur !== "boolean" ||
        !["tam", "yarim"].includes(a.genislik)
      )
        return false;
      if (
        b.tip === "yazilar" &&
        (!["izgara", "liste"].includes(a.gorunum) ||
          ![1, 2, 3].includes(a.sutun))
      )
        return false;
      if (
        b.tip === "one_cikan_yazi" &&
        (typeof a.postId !== "string" || a.postId.length > 128)
      )
        return false;
      if (
        b.tip === "metin_kutusu" &&
        (typeof a.baslik !== "string" ||
          a.baslik.length > 100 ||
          typeof a.metin !== "string" ||
          a.metin.length > 2000)
      )
        return false;
      if (
        b.tip === "sosyal_baglantilar" &&
        settings[b.tip].some(
          (k) =>
            typeof a[k] !== "string" ||
            a[k].length > 500 ||
            (a[k] && !safeUrl(a[k])),
        )
      )
        return false;
      return true;
    })
  );
}
export const normalizeTitle = (s) => s.trim().toLocaleLowerCase("tr-TR");
export function slugify(s) {
  return (
    s
      .toLocaleLowerCase("tr-TR")
      .replace(
        /[çğıöşü]/g,
        (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c],
      )
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "yazi"
  );
}
export function validatePost(p) {
  if (!p.title?.trim() || p.title.trim().length > 160)
    throw Error("Başlık 1–160 karakter olmalı.");
  if (!p.content?.trim() || p.content.length > 100000)
    throw Error("Yazı 1–100.000 karakter olmalı.");
  if (!CATEGORIES.includes(p.category)) throw Error("Bir kategori seçin.");
  if (!["draft", "published"].includes(p.status))
    throw Error("Yazı durumu geçersiz.");
}
export function validateImage(file) {
  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ].includes(file.type)
  )
    throw Error("JPG, PNG, WebP, GIF veya AVIF görsel seçin.");
  if (file.size > 2 * 1024 * 1024)
    throw Error("Görsel en fazla 2 MB olabilir.");
}
