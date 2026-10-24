import {
  $,
  $$,
  el,
  link,
  image,
  notify,
  errorText,
  busy,
  empty,
  seo,
  markdown,
  date,
  readTime,
} from "./yardimci.js";
import { isConfigured } from "./firebase.js";
import {
  currentUser,
  requireUser,
  signIn,
  signOut,
  register,
  resetPassword,
} from "./auth.js";
import {
  listPosts,
  listBlogs,
  getProfile,
  getBlog,
  getPost,
  getPostBySlug,
  saveProfile,
  uploadImage,
  removeUploadedImage,
  savePost,
  deletePost,
} from "./yazilar.js";
import {
  CATEGORIES,
  DEFAULT_THEME,
  DEFAULT_LAYOUT,
  validUsername,
  validateImage,
  validatePost,
} from "./validation.js";
import { demoUsers, demoPosts } from "./demo.js";
import { postCard, blogCard, postUrl } from "./gorunum.js";
import { initSiteTheme, applyTheme, setupThemeEditor } from "./tema.js";
import { renderBlog, setupLayoutEditor } from "./bloklar.js";
const page = document.body.dataset.page;
async function initHeader() {
  initSiteTheme();
  const user = await currentUser();
  if (user) {
    const nav = $("#account-nav");
    nav.replaceChildren(link("Panelim", "/panel.html", "button small"));
    const out = el("button", "text-button", "Çıkış yap");
    out.addEventListener("click", () => busy(out, signOut));
    nav.append(out);
  }
  const home =
    page === "home" &&
    new URLSearchParams(location.search).get("tab") !== "blogs";
  $('[data-nav="home"]').classList.toggle("active", home);
  $('[data-nav="blogs"]').classList.toggle("active", page === "home" && !home);
}
async function homePage() {
  let tab =
      new URLSearchParams(location.search).get("tab") === "blogs"
        ? "blogs"
        : "posts",
    category = new URLSearchParams(location.search).get("category") || "",
    search = "",
    postCursor = null,
    blogCursor = null,
    loading = false,
    generation = 0,
    blogsPromise;
  const feed = $("#feed"),
    more = $("#load-more");
  const getBlogs = () => (blogsPromise ??= listBlogs());
  const filters = $("#category-filters");
  ["Tümü", ...CATEGORIES].forEach((c) => {
    const button = el("button", "category-chip", c);
    button.type = "button";
    button.dataset.category = c === "Tümü" ? "" : c;
    button.addEventListener("click", () => {
      category = button.dataset.category;
      load(true);
    });
    filters.append(button);
  });
  async function load(reset = false) {
    const request = ++generation;
    if (reset) {
      postCursor = null;
      blogCursor = null;
      feed.replaceChildren(
        el(
          "p",
          "loading",
          tab === "posts" ? "Yazılar yükleniyor…" : "Bloglar yükleniyor…",
        ),
      );
    }
    loading = true;
    more.disabled = true;
    more.hidden = true;
    $$(".category-chip").forEach((b) => {
      const active = b.dataset.category === category;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    try {
      const data =
        tab === "posts"
          ? await listPosts({ cursor: postCursor, category, search })
          : blogCursor
            ? await listBlogs(blogCursor)
            : await getBlogs();
      if (request !== generation) return;
      if (reset) feed.replaceChildren();
      if (tab === "posts") {
        data.items.forEach((p) => feed.append(postCard(p)));
        postCursor = data.cursor;
      } else {
        data.items.forEach((u) => feed.append(blogCard(u)));
        blogCursor = data.cursor;
      }
      if (!feed.childNodes.length)
        empty(
          feed,
          tab === "posts"
            ? "Burada henüz bir hikâye yok"
            : "Henüz bir blog yok",
          search
            ? "Başlığın ilk kelimeleriyle aramayı deneyin."
            : "Başka bir kategoriye göz atabilir veya ilk hikâyeyi sen yazabilirsin.",
        );
      more.hidden = !data.hasMore;
    } catch (e) {
      if (request === generation) {
        empty(feed, "İçerik yüklenemedi", errorText(e));
        const retry = el("button", "button outline", "Yeniden dene");
        retry.addEventListener("click", () => load(true));
        feed.append(retry);
      }
    } finally {
      if (request === generation) {
        loading = false;
        more.disabled = false;
      }
    }
  }
  function switchTab(value) {
    tab = value;
    $("#tab-posts").classList.toggle("active", tab === "posts");
    $("#tab-blogs").classList.toggle("active", tab === "blogs");
    $("#tab-posts").setAttribute("aria-pressed", String(tab === "posts"));
    $("#tab-blogs").setAttribute("aria-pressed", String(tab === "blogs"));
    filters.hidden = tab === "blogs";
    $("#search-form").hidden = tab === "blogs";
    $('[data-nav="home"]').classList.toggle("active", tab === "posts");
    $('[data-nav="blogs"]').classList.toggle("active", tab === "blogs");
    load(true);
  }
  $("#tab-posts").addEventListener("click", () => switchTab("posts"));
  $("#tab-blogs").addEventListener("click", () => switchTab("blogs"));
  $("#all-blogs").addEventListener("click", () => switchTab("blogs"));
  more.addEventListener("click", () => {
    if (!loading) load();
  });
  $("#search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    search = $("#search").value.trim();
    load(true);
  });
  $("#search").addEventListener("search", () => {
    search = $("#search").value.trim();
    load(true);
  });
  getBlogs()
    .then(({ items }) => {
      items.slice(0, 4).forEach((u) => {
        $("#blog-list").append(blogCard(u, true));
        $("#hero-avatars").append(image(u.avatarUrl, "", ""));
      });
      if (!items.length)
        $("#blog-list").append(el("p", "muted", "İlk köşe seninki olabilir."));
    })
    .catch((e) => $("#blog-list").append(el("p", "muted", errorText(e))));
  switchTab(tab);
}
function authPage() {
  if (!isConfigured) $("#setup-note").hidden = false;
  const form = $("#auth-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const button = $('button[type="submit"]', form);
    busy(button, async () => {
      const email = $("#email").value.trim(),
        password = $("#password").value;
      if (page === "register") {
        const username = $("#username").value.trim();
        if (!validUsername(username))
          throw Error(
            "Bu kullanıcı adı uygun değil. Küçük harf, rakam ve tire kullan; ayrılmış adları seçme.",
          );
        await register({
          email,
          password,
          username,
          displayName: $("#displayName").value,
        });
      } else await signIn(email, password);
      location.assign("/panel.html");
    });
  });
  $("#reset-password")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const email = $("#email");
      if (!email.value || !email.checkValidity()) {
        email.reportValidity();
        email.focus();
        return;
      }
      try {
        await resetPassword(email.value.trim());
      } catch (e) {
        if (e.code !== "auth/user-not-found") throw e;
      }
      const msg = $("#form-message");
      msg.hidden = false;
      msg.textContent =
        "Bu e-posta ile bir hesap varsa sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.";
    }),
  );
}
async function panelPage() {
  const user = await requireUser();
  const profile = user
    ? await getProfile(user.uid)
    : structuredClone(demoUsers[0]);
  if (!profile)
    throw Error(
      "Profil kaydın bulunamadı. Kayıt işlemi yarım kalmış olabilir; destek için proje yöneticisine başvur.",
    );
  $("#demo-note").hidden = isConfigured;
  $("#welcome-title").textContent =
    `Merhaba, ${profile.displayName.split(" ")[0]}`;
  $("#my-blog-link").href = `/@${profile.username}`;
  let posts = [],
    cursor = null,
    pendingDelete = null;
  async function loadMine() {
    const data = await listPosts({ authorId: profile.id, owner: true, cursor });
    cursor = data.cursor;
    posts.push(...data.items);
    renderMine();
    $("#more-my-posts").hidden = !data.hasMore;
  }
  function renderMine() {
    const root = $("#my-posts");
    root.replaceChildren();
    if (!posts.length) {
      empty(
        root,
        "İlk hikâyen için yer hazır",
        "Yeni yazı düğmesine basarak başlayabilirsin.",
      );
      return;
    }
    posts.forEach((p) => {
      const row = el("article", "my-post"),
        body = el("div");
      body.append(
        el(
          "span",
          `status ${p.status === "draft" ? "draft" : ""}`,
          p.status === "draft" ? "TASLAK" : "YAYINDA",
        ),
        el("h3", "", p.title),
        el("p", "my-post-meta", `${p.category} · ${date(p.updatedAt)}`),
      );
      const actions = el("div", "row-actions");
      actions.append(
        link("Düzenle", `/editor.html?id=${encodeURIComponent(p.id)}`),
      );
      if (p.status === "published") actions.append(link("Gör", postUrl(p)));
      const remove = el("button", "", "Sil");
      remove.addEventListener("click", () => {
        pendingDelete = p.id;
        $("#delete-dialog").showModal();
      });
      actions.append(remove);
      row.append(image(p.coverUrl, "", ""), body, actions);
      root.append(row);
    });
  }
  $("#more-my-posts").addEventListener("click", (e) =>
    busy(e.currentTarget, loadMine),
  );
  $("#cancel-delete").addEventListener("click", () =>
    $("#delete-dialog").close(),
  );
  $("#confirm-delete").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      if (!user) throw Error("Önizleme yazıları silinemez.");
      await deletePost(pendingDelete);
      posts = posts.filter((p) => p.id !== pendingDelete);
      renderMine();
      $("#delete-dialog").close();
      notify("Yazı silindi.");
    }),
  );
  await loadMine();
  $$(".panel-nav [data-panel]").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".panel-nav [data-panel]").forEach((n) => {
        const active = n === b;
        n.classList.toggle("active", active);
        n.setAttribute("aria-current", active ? "page" : "false");
      });
      $$(".panel-content>section").forEach(
        (s) => (s.hidden = s.id !== `panel-${b.dataset.panel}`),
      );
    }),
  );
  $("#profile-name").value = profile.displayName;
  $("#profile-username").value = profile.username;
  $("#profile-bio").value = profile.bio;
  $("#profile-avatar").src = profile.avatarUrl || "/assets/placeholder.svg";
  $("#profile-cover").src = profile.coverUrl || "/assets/placeholder.svg";
  const localUrls = [];
  [
    ["#avatar-file", "#profile-avatar"],
    ["#profile-cover-file", "#profile-cover"],
  ].forEach(([input, output]) =>
    $(input).addEventListener("change", () => {
      const file = $(input).files[0];
      if (!file) return;
      try {
        validateImage(file);
        const url = URL.createObjectURL(file);
        localUrls.push(url);
        $(output).src = url;
      } catch (e) {
        $(input).value = "";
        notify(errorText(e), "error");
      }
    }),
  );
  window.addEventListener("pagehide", () =>
    localUrls.forEach(URL.revokeObjectURL),
  );
  $("#profile-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    busy($('button[type="submit"]', form), async () => {
      if (!user)
        throw Error("Profilini kaydetmek için Firebase bağlantısını tamamla.");
      const displayName = $("#profile-name").value.trim(),
        bio = $("#profile-bio").value.trim();
      if (!displayName || displayName.length > 80 || bio.length > 500)
        throw Error("Ad veya hakkında alanını kontrol et.");
      const updates = { displayName, bio };
      const uploads = [];
      try {
        for (const [input, folder, field] of [
          ["#avatar-file", "avatars", "avatarUrl"],
          ["#profile-cover-file", "covers", "coverUrl"],
        ]) {
          const file = $(input).files[0];
          if (file) {
            updates[field] = await uploadImage(user.uid, folder, file);
            uploads.push(updates[field]);
          }
        }
        await saveProfile(user.uid, updates);
      } catch (e) {
        await Promise.allSettled(uploads.map(removeUploadedImage));
        throw e;
      }
      Object.assign(profile, updates);
      $("#avatar-file").value = "";
      $("#profile-cover-file").value = "";
      notify("Profilin güncellendi.");
    });
  });
  let theme = profile.theme,
    layout = profile.layout,
    mode = profile.layoutMode;
  const published = posts.filter((p) => p.status === "published");
  function renderPreviews() {
    const p = { ...profile, theme, layout, layoutMode: mode };
    renderBlog($("#theme-preview"), p, published, { preview: true });
    renderBlog($("#layout-preview"), p, published, { preview: true });
  }
  setupThemeEditor(
    profile,
    (t) => {
      theme = t;
      renderPreviews();
    },
    (t) =>
      busy($("#save-theme"), async () => {
        if (!user)
          throw Error(
            "Tema önizlemesi hazır. Kaydetmek için Firebase bağlantısını tamamla.",
          );
        await saveProfile(user.uid, { theme: t });
        profile.theme = structuredClone(t);
        notify("Teman kaydedildi.");
      }),
  );
  setupLayoutEditor(
    profile,
    (l, m) => {
      layout = l;
      mode = m;
      renderPreviews();
    },
    (l, m) =>
      busy($("#save-layout"), async () => {
        if (!user)
          throw Error(
            "Düzen önizlemesi hazır. Kaydetmek için Firebase bağlantısını tamamla.",
          );
        await saveProfile(user.uid, { layout: l, layoutMode: m });
        profile.layout = structuredClone(l);
        profile.layoutMode = m;
        notify("Sayfa düzenin kaydedildi.");
      }),
    posts,
  );
  $$(".preview-device").forEach((b) =>
    b.addEventListener("click", () => {
      const shell = b.closest(".preview-shell");
      $(".blog-preview", shell).classList.toggle(
        "mobile",
        b.dataset.device === "mobile",
      );
      $$(".preview-device", shell).forEach((n) => {
        n.classList.toggle("active", n === b);
        n.setAttribute("aria-pressed", String(n === b));
      });
    }),
  );
  $$(".panel-nav [data-panel]").forEach((button) => (button.disabled = false));
}
async function editorPage() {
  const user = await requireUser();
  const profile = user ? await getProfile(user.uid) : demoUsers[0];
  if (!profile) throw Error("Profil kaydın bulunamadı.");
  $("#demo-note").hidden = isConfigured;
  CATEGORIES.forEach((c) => {
    const o = el("option", "", c);
    o.value = c;
    $("#post-category").append(o);
  });
  let id = new URLSearchParams(location.search).get("id"),
    existing = null,
    coverUrl = "",
    newFile = null,
    dirty = false,
    saving = false,
    objectUrl = null;
  if (id) {
    existing = await getPost(id);
    if (!existing || (user && existing.authorId !== user.uid))
      throw Error("Bu yazıyı düzenleme yetkin yok.");
    $("#post-title").value = existing.title;
    $("#post-content").value = existing.content;
    $("#post-excerpt").value = existing.excerpt;
    $("#post-category").value = existing.category;
    coverUrl = existing.coverUrl;
    $("#publish-post").textContent =
      existing.status === "published" ? "Değişiklikleri yayınla" : "Yayınla";
  }
  function cover(src) {
    $("#editor-cover-wrap").hidden = !src;
    if (src) $("#editor-cover").src = src;
  }
  cover(coverUrl);
  function count() {
    const text = $("#post-content").value.trim();
    $("#word-count").textContent =
      `${text ? text.split(/\s+/).length : 0} kelime · ${readTime(text)} dk okuma`;
  }
  count();
  $("#editor-form").addEventListener("input", () => {
    dirty = true;
    count();
    if (!$("#editor-preview").hidden)
      markdown($("#post-content").value, $("#editor-preview"));
  });
  $("#post-cover").addEventListener("change", () => {
    const f = $("#post-cover").files[0];
    if (!f) return;
    try {
      validateImage(f);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      newFile = f;
      objectUrl = URL.createObjectURL(f);
      cover(objectUrl);
      dirty = true;
    } catch (e) {
      $("#post-cover").value = "";
      notify(errorText(e), "error");
    }
  });
  $("#remove-cover").addEventListener("click", () => {
    newFile = null;
    coverUrl = "";
    $("#post-cover").value = "";
    cover("");
    dirty = true;
  });
  $("#preview-toggle").addEventListener("click", () => {
    const on = $("#editor-preview").hidden;
    $("#editor-preview").hidden = !on;
    $("#post-content").hidden = on;
    $("#preview-toggle").textContent = on ? "Yazmaya dön" : "Önizleme";
    $("#preview-toggle").setAttribute("aria-pressed", String(on));
    if (on) markdown($("#post-content").value, $("#editor-preview"));
  });
  $$("[data-markdown]").forEach((b) =>
    b.addEventListener("click", () => {
      const input = $("#post-content");
      const start = input.selectionStart,
        end = input.selectionEnd,
        selected = input.value.slice(start, end) || "metin";
      const replacement = {
        bold: `**${selected}**`,
        italic: `*${selected}*`,
        heading: `\n## ${selected}\n`,
        link: `[${selected}](https://)`,
        quote: `\n> ${selected}\n`,
      }[b.dataset.markdown];
      input.setRangeText(replacement, start, end, "select");
      input.focus();
      dirty = true;
      count();
    }),
  );
  async function save(status, button) {
    if (saving) return;
    await busy(button, async () => {
      saving = true;
      const buttons = [$("#save-draft"), $("#publish-post")];
      buttons.forEach((b) => (b.disabled = true));
      let uploaded;
      try {
        if (!user)
          throw Error("Yazını kaydetmek için Firebase bağlantısını tamamla.");
        const data = {
          title: $("#post-title").value.trim(),
          content: $("#post-content").value,
          excerpt:
            $("#post-excerpt").value.trim() ||
            $("#post-content")
              .value.replace(/[#*`>\[\]]/g, "")
              .slice(0, 250),
          category: $("#post-category").value,
          status,
          coverUrl,
        };
        validatePost(data);
        if (newFile) {
          uploaded = await uploadImage(user.uid, "covers", newFile);
          data.coverUrl = uploaded;
        }
        id = await savePost(user, profile, data, id);
        coverUrl = data.coverUrl;
        newFile = null;
        $("#post-cover").value = "";
        dirty = false;
        history.replaceState(
          null,
          "",
          `/editor.html?id=${encodeURIComponent(id)}`,
        );
        $("#save-status").textContent =
          `${status === "draft" ? "Taslak kaydedildi" : "Yazı yayınlandı"} · ${new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
        $("#publish-post").textContent =
          status === "published" ? "Değişiklikleri yayınla" : "Yayınla";
        notify(
          status === "draft" ? "Taslağın kaydedildi." : "Yazın yayınlandı.",
        );
      } catch (e) {
        if (uploaded) await removeUploadedImage(uploaded).catch(() => {});
        throw e;
      } finally {
        saving = false;
        buttons.forEach((b) => (b.disabled = false));
      }
    });
  }
  $("#save-draft").addEventListener("click", () =>
    save("draft", $("#save-draft")),
  );
  $("#publish-post").addEventListener("click", () =>
    save("published", $("#publish-post")),
  );
  $("#editor-form").addEventListener("submit", (e) => e.preventDefault());
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  window.addEventListener("pagehide", () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });
}
function routeParts() {
  const parts = decodeURIComponent(location.pathname)
    .split("/")
    .filter(Boolean);
  return {
    username: parts[0]?.startsWith("@")
      ? parts[0].slice(1)
      : new URLSearchParams(location.search).get("username"),
    slug: parts[1] || new URLSearchParams(location.search).get("slug"),
  };
}
async function blogPage() {
  const { username } = routeParts();
  const profile = await getBlog(
    username || (!isConfigured ? "deniz-yilmaz" : ""),
  );
  const root = $("#blog-root");
  if (!profile) {
    empty(
      root,
      "Bu köşeyi bulamadık",
      "Adresi kontrol edebilir veya ana sayfadan başka bloglara göz atabilirsin.",
    );
    seo("Blog bulunamadı", "Bu blog adresi bulunamadı.");
    return;
  }
  seo(
    profile.displayName,
    profile.bio || `${profile.displayName} tarafından paylaşılan yazılar.`,
  );
  let posts = [],
    cursor = null,
    hasMore = false;
  async function load(button) {
    if (button) button.disabled = true;
    try {
      const data = await listPosts({ authorId: profile.id, cursor });
      posts = [
        ...new Map([...posts, ...data.items].map((p) => [p.id, p])).values(),
      ];
      cursor = data.cursor;
      hasMore = data.hasMore;
      render();
    } catch (e) {
      if (button) {
        button.disabled = false;
        notify(errorText(e), "error");
      } else throw e;
    }
  }
  const featured = [];
  for (const b of profile.layout || []) {
    if (b.tip === "one_cikan_yazi" && b.ayar.gorunur && b.ayar.postId)
      featured.push(b.ayar.postId);
  }
  const extras = [];
  function render() {
    renderBlog(root, profile, posts, { loadMore: hasMore ? load : null });
  }
  await load();
  for (const id of new Set(featured)) {
    if (posts.some((p) => p.id === id)) continue;
    try {
      const p = await getPost(id);
      if (p?.status === "published" && p.authorId === profile.id)
        extras.push(p);
    } catch {}
  }
  if (extras.length) {
    posts.push(...extras);
    posts.sort(
      (a, b) =>
        new Date(b.publishedAt?.toDate?.() || b.publishedAt) -
        new Date(a.publishedAt?.toDate?.() || a.publishedAt),
    );
    render();
  }
}
async function postPage() {
  const { username, slug } = routeParts();
  const params = new URLSearchParams(location.search);
  const p = params.get("id")
    ? await getPost(params.get("id"))
    : await getPostBySlug(
        username || (!isConfigured ? "deniz-yilmaz" : ""),
        slug || (!isConfigured ? demoPosts[0].slug : ""),
      );
  const root = $("#post-root");
  if (!p) {
    empty(
      root,
      "Yazı bulunamadı",
      "Bu yazı kaldırılmış veya henüz yayınlanmamış olabilir.",
    );
    seo("Yazı bulunamadı", "Bu yazı bulunamadı.");
    return;
  }
  const profile = await getProfile(p.authorId);
  root.className = "themed-post";
  applyTheme(root, profile?.theme || DEFAULT_THEME);
  seo(p.title, p.excerpt);
  root.replaceChildren();
  const header = el("header", "article-header");
  header.append(
    link("← " + p.authorName, `/@${p.authorUsername}`, "back-link"),
    el("span", "post-category", p.category),
    el("h1", "", p.title),
    el("p", "article-subtitle", p.excerpt),
  );
  const author = el("div", "article-byline");
  if (profile) author.append(image(profile.avatarUrl, "", ""));
  const info = el("div");
  info.append(
    link(p.authorName, `/@${p.authorUsername}`),
    el(
      "small",
      "",
      `${date(p.publishedAt)} · ${readTime(p.content)} dk okuma${p.status === "draft" ? " · Taslak" : ""}`,
    ),
  );
  author.append(info);
  header.append(author);
  root.append(header);
  if (p.coverUrl) root.append(image(p.coverUrl, "", "article-cover"));
  const content = el("div", "prose article-content");
  markdown(p.content, content);
  root.append(content);
  const footer = el("footer", "article-footer");
  footer.append(
    link(
      `${p.authorName} köşesine dön ↗`,
      `/@${p.authorUsername}`,
      "text-link",
    ),
  );
  const share = el("button", "text-button", "Bağlantıyı kopyala");
  share.addEventListener("click", () =>
    busy(share, async () => {
      await navigator.clipboard.writeText(location.href);
      notify("Yazının bağlantısı kopyalandı.");
    }),
  );
  footer.append(share);
  root.append(footer);
}
const routes = {
  home: homePage,
  login: authPage,
  register: authPage,
  panel: panelPage,
  editor: editorPage,
  blog: blogPage,
  post: postPage,
};
initHeader().catch((e) => notify(errorText(e), "error"));
Promise.resolve()
  .then(() => routes[page]?.())
  .catch((e) => {
    empty($("#main"), "Sayfa açılamadı", errorText(e));
    $("#main").append(link("Ana sayfaya dön", "/", "button outline"));
  });
