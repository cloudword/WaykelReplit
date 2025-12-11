import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Try multiple possible locations for the public directory
  // This handles both development and production bundled builds
  const possiblePaths = [
    path.resolve(__dirname, "public"),           // Bundled: dist/public (relative to dist/index.cjs)
    path.resolve(process.cwd(), "dist/public"),  // From project root
    path.resolve(__dirname, "../dist/public"),   // Alternative bundled location
  ];

  let distPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
      distPath = p;
      console.log(`[static] Serving static files from: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    console.error("[static] Searched paths:", possiblePaths);
    throw new Error(
      `Could not find the build directory with index.html. Searched: ${possiblePaths.join(", ")}`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
