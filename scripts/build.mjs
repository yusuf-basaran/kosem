import { cp, mkdir, readdir, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of await readdir("."))
  if (file.endsWith(".html")) await cp(file, `dist/${file}`);
for (const dir of ["assets", "css", "js", "vendor"])
  await cp(dir, `dist/${dir}`, { recursive: true });
console.log("Statik dosyalar dist klasörüne hazırlandı.");
