import { safeUrl } from "./validation.js";
export const $ = (s, scope = document) => scope.querySelector(s);
export const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
export function el(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}
export function link(text, href, className) {
  const a = el("a", className, text);
  a.href = href;
  return a;
}
export function image(url, alt, className) {
  const img = el("img", className);
  img.src =
    safeUrl(url) ||
    (typeof url === "string" && /^\/assets\/[a-zA-Z0-9_.-]+$/.test(url)
      ? url
      : "/assets/placeholder.svg");
  img.alt = alt;
  img.loading = "lazy";
  img.addEventListener(
    "error",
    () => {
      img.src = "/assets/placeholder.svg";
    },
    { once: true },
  );
  return img;
}
export function date(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
}
export const readTime = (text) =>
  Math.max(1, Math.ceil((text || "").split(/\s+/).length / 200));
export function notify(message, type = "success") {
  let box = $("#toast");
  if (!box) {
    box = el("div", "toast");
    box.id = "toast";
    box.setAttribute("role", "status");
    document.body.append(box);
  }
  box.dataset.type = type;
  box.textContent = message;
  box.hidden = false;
  clearTimeout(box.timer);
  box.timer = setTimeout(() => (box.hidden = true), 6000);
}
const errors = {
  "auth/invalid-credential": "E-posta veya şifre hatalı.",
  "auth/wrong-password": "E-posta veya şifre hatalı.",
  "auth/user-not-found": "E-posta veya şifre hatalı.",
  "auth/email-already-in-use": "Bu e-posta adresi zaten kullanılıyor.",
  "auth/weak-password": "En az 8 karakterli bir şifre belirleyin.",
  "auth/invalid-email": "Geçerli bir e-posta adresi yazın.",
  "auth/too-many-requests":
    "Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.",
  "auth/network-request-failed":
    "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.",
  "auth/unauthorized-domain":
    "Bu alan adı Firebase Authentication içinde yetkilendirilmemiş.",
  "permission-denied":
    "Bu işlem için yetkiniz yok. Hesabınızı ve güvenlik kurallarını kontrol edin.",
  "failed-precondition":
    "Sorgu indeksi henüz hazır değil. Kurulum belgesindeki indeksleri yayınlayın.",
  unavailable: "Sunucuya ulaşılamıyor. Lütfen tekrar deneyin.",
  "storage/unauthorized": "Bu görsel için yükleme yetkiniz yok.",
  "storage/retry-limit-exceeded": "Yükleme tamamlanamadı. Tekrar deneyin.",
  "auth/operation-not-allowed":
    "Firebase konsolunda e-posta/şifre ile girişi etkinleştirin.",
};
export const errorText = (error) =>
  errors[error.code] ||
  (error.code
    ? "İşlem tamamlanamadı. Lütfen yeniden deneyin."
    : error.message) ||
  "Beklenmeyen bir hata oluştu.";
export async function busy(button, action) {
  if (button.disabled) return;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Lütfen bekleyin…";
  try {
    return await action();
  } catch (e) {
    notify(errorText(e), "error");
  } finally {
    button.disabled = false;
    if (button.textContent === "Lütfen bekleyin…") button.textContent = label;
  }
}
export function empty(container, title, detail) {
  container.replaceChildren();
  const box = el("div", "empty-state");
  box.append(el("h3", "", title), el("p", "muted", detail));
  container.append(box);
}
export function seo(title, description) {
  document.title = `${title} · Köşem`;
  $('meta[name="description"]').content = description.slice(0, 160);
}
export function markdown(content, target) {
  if (!window.marked || !window.DOMPurify) {
    target.textContent = content;
    return;
  }
  const renderer = new window.marked.Renderer();
  renderer.html = (token) =>
    token.text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  target.innerHTML = window.DOMPurify.sanitize(
    window.marked.parse(content, { breaks: true, gfm: true, renderer }),
    {
      USE_PROFILES: { html: true },
      FORBID_TAGS: [
        "style",
        "iframe",
        "form",
        "input",
        "button",
        "video",
        "audio",
        "svg",
      ],
      FORBID_ATTR: ["style", "id", "name", "class"],
    },
  );
  target.querySelectorAll("a").forEach((a) => {
    const url = safeUrl(a.href);
    if (url) {
      a.href = url;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
    } else a.removeAttribute("href");
  });
  target.querySelectorAll("img").forEach((img) => {
    if (!safeUrl(img.getAttribute("src"))) img.remove();
    else {
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
    }
  });
}
