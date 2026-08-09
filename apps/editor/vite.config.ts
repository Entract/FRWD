import { defineConfig } from "vite";

export default defineConfig({
  // The editor is a local application. Nothing it builds is embedded in a
  // document, so it has no bearing on what a .frwd contains.
  build: { target: "es2022", sourcemap: true },
});
