import { DEFAULT_THEME, FONTS, validateTheme } from "./validation.js";
import { $, $$, el } from "./yardimci.js";
const preset = (name, mod, arkaplan, kart, yazi, vurgu) => ({
  name,
  theme: {
    mod,
    renkler: { arkaplan, kart, yazi, vurgu },
    font: "Inter",
    kose: "yumusak",
    yogunluk: "rahat",
  },
});
export const PRESETS = [
  preset("Kum", "acik", "#FAF7F2", "#FFFFFF", "#1F1B16", "#C2410C"),
  preset("Gece", "koyu", "#16130F", "#221E18", "#F2ECE2", "#E8743B"),
  preset("Orman", "acik", "#F1F5F0", "#FFFFFF", "#18261C", "#2F6B3E"),
  preset("Mürekkep", "acik", "#F4F6FA", "#FFFFFF", "#12182B", "#1F3A8A"),
  preset("Gül", "acik", "#FBF3F1", "#FFFFFF", "#2A1A1A", "#9F2D3F"),
  preset("Kömür", "koyu", "#1B1B1B", "#262626", "#EDEDED", "#D9A441"),
];
const luminance = (hex) => {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
export function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function themeWarnings(theme) {
  if (!validateTheme(theme)) return ["Geçersiz tema."];
  const c = theme.renkler;
  return [
    [c.yazi, c.arkaplan, "Yazı / arka plan"],
    [c.yazi, c.kart, "Yazı / kart"],
    [c.vurgu, c.arkaplan, "Bağlantı / arka plan"],
    [c.vurgu, c.kart, "Bağlantı / kart"],
  ]
    .filter(([a, b]) => contrast(a, b) < 4.5)
    .map(([a, b, label]) => `${label}: ${contrast(a, b).toFixed(2)}:1`);
}
export function applyTheme(target, value) {
  const t = validateTheme(value) ? value : DEFAULT_THEME;
  Object.entries(t.renkler).forEach(([key, color]) =>
    target.style.setProperty(`--renk-${key}`, color),
  );
  target.style.setProperty(
    "--renk-vurgu-ustu",
    contrast(t.renkler.vurgu, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#16130F",
  );
  target.style.setProperty("--renk-yazi-ikincil", t.renkler.yazi);
  Object.entries({
    page: t.renkler.arkaplan,
    ink: t.renkler.yazi,
    muted: t.renkler.yazi,
    green: t.renkler.vurgu,
    surface: t.renkler.kart,
    line: t.mod === "koyu" ? "#352F26" : "#E8E1D5",
  }).forEach(([key, value]) => target.style.setProperty(`--${key}`, value));
  target.style.setProperty(
    "--blog-font",
    `"${t.font}", ${["Lora", "Merriweather", "Source Serif 4", "Literata", "Libre Baskerville"].includes(t.font) ? "serif" : "sans-serif"}`,
  );
  target.style.setProperty(
    "--blog-radius",
    { keskin: "2px", yumusak: "10px", yuvarlak: "20px" }[t.kose],
  );
  target.style.setProperty(
    "--blog-gap",
    t.yogunluk === "rahat" ? "24px" : "12px",
  );
  target.dataset.blogMode = t.mod;
  return t;
}
export function initSiteTheme() {
  const button = $("#site-theme-toggle");
  const update = () => {
    const dark = document.documentElement.dataset.tema === "koyu";
    button.textContent = dark ? "Açık görünüm" : "Koyu görünüm";
    button.setAttribute("aria-pressed", String(dark));
  };
  button.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.tema === "koyu" ? "acik" : "koyu";
    document.documentElement.dataset.tema = next;
    try {
      localStorage.setItem("kosem-theme", next);
    } catch {}
    update();
  });
  update();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let stored;
    try {
      stored = localStorage.getItem("kosem-theme");
    } catch {}
    if (!stored) {
      document.documentElement.dataset.tema = e.matches ? "koyu" : "acik";
      update();
    }
  });
}
export function setupThemeEditor(profile, onPreview, onSave) {
  let theme = structuredClone(
    validateTheme(profile.theme) ? profile.theme : DEFAULT_THEME,
  );
  const presets = $("#theme-presets");
  PRESETS.forEach(({ name, theme: t }) => {
    const btn = el("button", "preset");
    btn.type = "button";
    const colors = el("span", "preset-colors");
    Object.values(t.renkler).forEach((c) => {
      const dot = el("i");
      dot.style.backgroundColor = c;
      colors.append(dot);
    });
    btn.append(colors, document.createTextNode(name));
    btn.addEventListener("click", () => {
      theme = structuredClone(t);
      fill();
      render();
    });
    presets.append(btn);
  });
  FONTS.forEach((font) => {
    const o = el("option", "", font);
    o.value = font;
    $("#theme-font").append(o);
  });
  const labels = {
    arkaplan: "Arka plan",
    yazi: "Yazı",
    vurgu: "Vurgu",
    kart: "Kart",
  };
  Object.entries(labels).forEach(([key, label]) => {
    const field = el("div", "field");
    const l = el("label", "", label);
    l.htmlFor = `color-${key}`;
    const input = el("input");
    input.type = "color";
    input.id = `color-${key}`;
    input.dataset.color = key;
    field.append(l, input);
    $("#color-fields").append(field);
  });
  function fill() {
    $("#theme-mode").value = theme.mod;
    $("#theme-font").value = theme.font;
    $("#theme-radius").value = theme.kose;
    $("#theme-density").value = theme.yogunluk;
    $$("[data-color]").forEach(
      (n) => (n.value = theme.renkler[n.dataset.color]),
    );
  }
  function render() {
    const warnings = themeWarnings(theme);
    $("#contrast-note").textContent = warnings.length
      ? `Kontrast düşük (en az 4.5:1 olmalı). ${warnings.join("; ")}. Renkleri koyulaştırmayı veya açmayı dene.`
      : "Renklerin metin kontrastı WCAG AA düzeyinde.";
    $("#contrast-note").classList.toggle(
      "contrast-warning",
      warnings.length > 0,
    );
    $$(".preset", presets).forEach((b, i) => {
      const preset = PRESETS[i].theme;
      const active =
        ["mod", "font", "kose", "yogunluk"].every(
          (key) => preset[key] === theme[key],
        ) &&
        Object.keys(preset.renkler).every(
          (key) =>
            preset.renkler[key].toLowerCase() ===
            theme.renkler[key].toLowerCase(),
        );
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    onPreview(theme);
  }
  $("#theme-form").addEventListener("submit", (e) => e.preventDefault());
  $("#theme-form").addEventListener("input", () => {
    theme = {
      mod: $("#theme-mode").value,
      font: $("#theme-font").value,
      kose: $("#theme-radius").value,
      yogunluk: $("#theme-density").value,
      renkler: Object.fromEntries(
        $$("[data-color]").map((n) => [n.dataset.color, n.value]),
      ),
    };
    if (validateTheme(theme)) render();
  });
  $("#theme-mode").addEventListener("change", () => {
    const chosen = PRESETS[theme.mod === "koyu" ? 1 : 0];
    theme.renkler = structuredClone(chosen.theme.renkler);
    fill();
    render();
  });
  $("#save-theme").addEventListener("click", () => onSave(theme));
  fill();
  render();
  return () => theme;
}
