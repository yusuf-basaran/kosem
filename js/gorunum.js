import { el, image, link, date, readTime } from "./yardimci.js";
import { validateTheme } from "./validation.js";
export const postUrl = (p) =>
  `/@${encodeURIComponent(p.authorUsername)}/${encodeURIComponent(p.slug)}`;
export function postCard(p) {
  const card = el("article", "post-card");
  const cover = link("", postUrl(p), "post-cover-link");
  cover.setAttribute("aria-label", p.title);
  cover.append(image(p.coverUrl, "", "post-cover"));
  const category = el("span", "post-category", p.category);
  const title = el("h3");
  title.append(link(p.title, postUrl(p)));
  const excerpt = el("p", "post-excerpt", p.excerpt);
  const byline = el("div", "post-byline");
  byline.append(
    link(p.authorName, `/@${encodeURIComponent(p.authorUsername)}`),
    el("span", "dot", "·"),
    el("span", "date", date(p.publishedAt)),
    el("span", "read-time", `${readTime(p.content)} dk okuma`),
  );
  card.append(cover, category, title, excerpt, byline);
  return card;
}
export function blogCard(u, compact = false) {
  if (compact) {
    const a = link("", `/@${u.username}`, "compact-blog");
    a.append(image(u.avatarUrl, "", ""));
    const body = el("div");
    body.append(
      el("h4", "", u.displayName),
      el("p", "", u.bio || `@${u.username} kendi köşesinde yazıyor.`),
    );
    a.append(body);
    return a;
  }
  const card = el("article", "blog-card");
  if (validateTheme(u.theme))
    card.style.setProperty("--blog-accent", u.theme.renkler.vurgu);
  card.append(
    image(u.avatarUrl, "", ""),
    el("h3", "", u.displayName),
    el("p", "", u.bio || `@${u.username} kendi köşesinde yazıyor.`),
    link("Köşesine uğra ↗", `/@${u.username}`, "text-link"),
  );
  return card;
}
