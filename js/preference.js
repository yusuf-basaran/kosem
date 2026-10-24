(() => {
  let saved;
  try {
    saved = localStorage.getItem("kosem-theme");
  } catch {}
  document.documentElement.dataset.tema = ["acik", "koyu"].includes(saved)
    ? saved
    : matchMedia("(prefers-color-scheme: dark)").matches
      ? "koyu"
      : "acik";
})();
