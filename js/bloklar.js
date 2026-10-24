import {
  validateLayout,
  DEFAULT_LAYOUT,
  BLOCK_TYPES,
  LAYOUT_MODES,
} from "./validation.js";
import { applyTheme } from "./tema.js";
import { el, link, image, $, $$, empty } from "./yardimci.js";
import { postCard } from "./gorunum.js";
export const BLOCK_LABELS = {
  kapak: "Kapak",
  hakkimda: "Hakkımda",
  yazilar: "Yazılar",
  one_cikan_yazi: "Öne çıkan yazı",
  kategoriler: "Kategoriler",
  sosyal_baglantilar: "Sosyal bağlantılar",
  metin_kutusu: "Metin kutusu",
};
export function renderBlog(
  root,
  profile,
  posts,
  { preview = false, loadMore = null } = {},
) {
  root.replaceChildren();
  applyTheme(root, profile.theme);
  const layout = validateLayout(profile.layout)
    ? profile.layout
    : DEFAULT_LAYOUT;
  const wrapper = el("div", "blog-layout");
  wrapper.dataset.mode = LAYOUT_MODES.includes(profile.layoutMode)
    ? profile.layoutMode
    : "tek";
  layout
    .filter((b) => b.ayar.gorunur)
    .forEach((block) => {
      const a = block.ayar;
      const section = el(
        "section",
        `blog-block ${a.genislik === "tam" ? "full" : "half"}`,
      );
      switch (block.tip) {
        case "kapak": {
          section.classList.remove("blog-block");
          section.classList.add("blog-header");
          if (profile.coverUrl)
            section.append(image(profile.coverUrl, "", "blog-cover"));
          const intro = el("div", "blog-intro");
          intro.append(
            image(
              profile.avatarUrl,
              `${profile.displayName} profil fotoğrafı`,
              "blog-avatar",
            ),
            el("h1", "", profile.displayName),
            el("span", "blog-username", `@${profile.username}`),
          );
          section.append(intro);
          break;
        }
        case "hakkimda":
          section.classList.add("about-box");
          section.append(
            el("h2", "", "Köşeme hoş geldin"),
            el("p", "", profile.bio || "Burada yeni hikâyeler birikiyor."),
          );
          break;
        case "yazilar": {
          section.append(el("h2", "", "Son yazılar"));
          const grid = el(
            "div",
            `post-grid ${a.gorunum === "liste" ? "list-view" : ""}`,
          );
          grid.style.gridTemplateColumns = `repeat(${[1, 2, 3].includes(a.sutun) ? a.sutun : 2},minmax(0,1fr))`;
          posts.forEach((p) => grid.append(postCard(p)));
          if (!posts.length)
            empty(grid, "Henüz bir yazı yok", "İlk hikâye yakında bu köşede.");
          section.append(grid);
          if (loadMore && !preview) {
            const wrap = el("div", "load-more-wrap");
            const btn = el("button", "button outline", "Daha fazla yazı");
            btn.type = "button";
            btn.addEventListener("click", () => loadMore(btn));
            wrap.append(btn);
            section.append(wrap);
          }
          break;
        }
        case "one_cikan_yazi": {
          section.append(el("h2", "", "Öne çıkan yazı"));
          const p = a.postId ? posts.find((p) => p.id === a.postId) : posts[0];
          if (p) section.append(postCard(p));
          else
            section.append(
              el("p", "muted", "Öne çıkarılan yazı şu anda yayında değil."),
            );
          break;
        }
        case "kategoriler": {
          section.append(el("h2", "", "Kategoriler"));
          const links = el("div", "category-links");
          [...new Set(posts.map((p) => p.category))].forEach((c) =>
            links.append(
              link(c, `/index.html?category=${encodeURIComponent(c)}`),
            ),
          );
          if (!posts.length)
            links.append(
              el(
                "p",
                "muted",
                "Yayınlanan yazılarla kategoriler burada görünür.",
              ),
            );
          section.append(links);
          break;
        }
        case "sosyal_baglantilar": {
          section.append(el("h2", "", "Başka yerlerde"));
          const list = el("div", "social-links");
          const labels = {
            website: "Web sitesi",
            instagram: "Instagram",
            github: "GitHub",
            linkedin: "LinkedIn",
          };
          Object.entries(labels).forEach(([key, label]) => {
            if (a[key]) {
              const anchor = link(`${label} ↗`, a[key]);
              anchor.target = "_blank";
              anchor.rel = "noopener noreferrer";
              list.append(anchor);
            }
          });
          if (!list.childNodes.length)
            list.append(
              el(
                "p",
                "muted",
                preview ? "Bağlantı eklediğinde burada görünecek." : "",
              ),
            );
          section.append(list);
          break;
        }
        case "metin_kutusu":
          section.classList.add("text-box");
          if (a.baslik) section.append(el("h2", "", a.baslik));
          section.append(el("p", "", a.metin));
          break;
      }
      wrapper.append(section);
    });
  if (!wrapper.childNodes.length)
    empty(
      wrapper,
      "Bu köşe hazırlanıyor",
      "Yakında burada yeni hikâyeler olacak.",
    );
  root.append(wrapper);
}
export function setupLayoutEditor(profile, onPreview, onSave, posts) {
  let layout = structuredClone(
      validateLayout(profile.layout) ? profile.layout : DEFAULT_LAYOUT,
    ),
    mode = LAYOUT_MODES.includes(profile.layoutMode)
      ? profile.layoutMode
      : "tek";
  let dragged = null;
  const list = $("#block-list");
  BLOCK_TYPES.forEach((type) => {
    const o = el("option", "", BLOCK_LABELS[type]);
    o.value = type;
    $("#add-block-type").append(o);
  });
  $("#layout-mode").value = mode;
  $("#layout-mode").addEventListener("change", (e) => {
    mode = e.target.value;
    preview();
  });
  function preview() {
    if (validateLayout(layout)) onPreview(layout, mode);
  }
  function field(container, label, type, value, onInput, choices) {
    const wrap = el("div", "field"),
      id = `field-${crypto.randomUUID()}`,
      l = el("label", "", label);
    l.htmlFor = id;
    const input = el(
      type === "select" ? "select" : type === "textarea" ? "textarea" : "input",
    );
    input.id = id;
    if (type === "select")
      choices.forEach(([val, text]) => {
        const o = el("option", "", text);
        o.value = val;
        input.append(o);
      });
    else if (type !== "textarea") input.type = type;
    if (type === "textarea") {
      input.maxLength = 2000;
      input.rows = 3;
    }
    if (type === "text") input.maxLength = 100;
    if (type === "url") input.maxLength = 500;
    input.value = value ?? "";
    input.addEventListener("input", () => {
      onInput(input.value);
      preview();
    });
    wrap.append(l, input);
    container.append(wrap);
  }
  function move(from, to) {
    if (to < 0 || to >= layout.length) return;
    const [item] = layout.splice(from, 1);
    layout.splice(to, 0, item);
    render();
    preview();
    $("#block-list").children[to]?.querySelector("button")?.focus();
  }
  function render() {
    list.replaceChildren();
    layout.forEach((block, i) => {
      const item = el("div", "block-item");
      item.draggable = true;
      item.dataset.id = block.id;
      item.addEventListener("dragstart", (e) => {
        if (e.target.closest("input,textarea,select")) {
          e.preventDefault();
          return;
        }
        dragged = i;
        e.dataTransfer.setData("text/plain", block.id);
        e.dataTransfer.effectAllowed = "move";
        item.classList.add("dragging");
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        dragged = null;
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        if (dragged !== null && dragged !== i) move(dragged, i);
      });
      const top = el("div", "block-top"),
        handle = el("span", "drag-handle", "⠿");
      handle.setAttribute("aria-hidden", "true");
      top.append(handle, el("strong", "", BLOCK_LABELS[block.tip]));
      const actions = el("div", "block-actions");
      const up = el("button", "", "↑"),
        down = el("button", "", "↓"),
        remove = el("button", "", "×");
      [up, down, remove].forEach((b) => (b.type = "button"));
      up.setAttribute(
        "aria-label",
        `${BLOCK_LABELS[block.tip]} bloğunu yukarı taşı`,
      );
      down.setAttribute(
        "aria-label",
        `${BLOCK_LABELS[block.tip]} bloğunu aşağı taşı`,
      );
      remove.setAttribute(
        "aria-label",
        `${BLOCK_LABELS[block.tip]} bloğunu sil`,
      );
      up.disabled = i === 0;
      down.disabled = i === layout.length - 1;
      up.addEventListener("click", () => move(i, i - 1));
      down.addEventListener("click", () => move(i, i + 1));
      remove.addEventListener("click", () => {
        layout.splice(i, 1);
        render();
        preview();
      });
      actions.append(up, down, remove);
      top.append(actions);
      item.append(top);
      const visible = el("label", "block-visibility"),
        check = el("input");
      check.type = "checkbox";
      check.checked = block.ayar.gorunur;
      check.addEventListener("change", () => {
        block.ayar.gorunur = check.checked;
        preview();
      });
      visible.append(check, document.createTextNode("Blogda göster"));
      item.append(visible);
      const settings = el("div", "block-settings");
      field(
        settings,
        "Genişlik",
        "select",
        block.ayar.genislik,
        (v) => (block.ayar.genislik = v),
        [
          ["tam", "Tam"],
          ["yarim", "Yarım"],
        ],
      );
      if (block.tip === "yazilar") {
        field(
          settings,
          "Görünüm",
          "select",
          block.ayar.gorunum,
          (v) => (block.ayar.gorunum = v),
          [
            ["izgara", "Izgara"],
            ["liste", "Liste"],
          ],
        );
        field(
          settings,
          "Sütun",
          "select",
          block.ayar.sutun,
          (v) => (block.ayar.sutun = Number(v)),
          [
            [1, "1 sütun"],
            [2, "2 sütun"],
            [3, "3 sütun"],
          ],
        );
      }
      if (block.tip === "one_cikan_yazi")
        field(
          settings,
          "Yazı seç",
          "select",
          block.ayar.postId,
          (v) => (block.ayar.postId = v),
          [
            ["", "En yeni yayınlanan yazı"],
            ...posts
              .filter((p) => p.status === "published")
              .map((p) => [p.id, p.title]),
          ],
        );
      if (block.tip === "metin_kutusu") {
        field(
          settings,
          "Başlık",
          "text",
          block.ayar.baslik,
          (v) => (block.ayar.baslik = v),
        );
        field(
          settings,
          "Metin",
          "textarea",
          block.ayar.metin,
          (v) => (block.ayar.metin = v),
        );
      }
      if (block.tip === "sosyal_baglantilar")
        Object.entries({
          website: "Web sitesi",
          instagram: "Instagram",
          github: "GitHub",
          linkedin: "LinkedIn",
        }).forEach(([k, label]) =>
          field(
            settings,
            label,
            "url",
            block.ayar[k],
            (v) => (block.ayar[k] = v),
          ),
        );
      item.append(settings);
      list.append(item);
    });
    $("#add-block").disabled = layout.length >= 8;
  }
  $("#add-block").addEventListener("click", () => {
    if (layout.length >= 8) return;
    const tip = $("#add-block-type").value;
    const ayar = { gorunur: true, genislik: "tam" };
    if (tip === "yazilar") Object.assign(ayar, { gorunum: "izgara", sutun: 2 });
    if (tip === "one_cikan_yazi") ayar.postId = "";
    if (tip === "metin_kutusu") Object.assign(ayar, { baslik: "", metin: "" });
    if (tip === "sosyal_baglantilar")
      Object.assign(ayar, {
        website: "",
        instagram: "",
        github: "",
        linkedin: "",
      });
    layout.push({ id: `b-${crypto.randomUUID()}`, tip, ayar });
    render();
    preview();
  });
  $("#save-layout").addEventListener("click", () => onSave(layout, mode));
  render();
  preview();
}
