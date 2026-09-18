import { defineConfig } from "tsup";
import fs from "fs";
import path from "path";

export default defineConfig({
  entry: ["src/mcp-entry.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  outExtension() {
    return {
      js: ".js",
    };
  },
  async onSuccess() {
    fs.writeFileSync(
      path.resolve(process.cwd(), "dist/package.json"),
      JSON.stringify({ type: "module" }, null, 2)
    );
  },
});
