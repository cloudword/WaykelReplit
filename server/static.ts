import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  console.log("[static] Starting static file setup...");
  console.log("[static] __dirname:", __dirname);
  console.log("[static] process.cwd():", process.cwd());
  
  // Try multiple possible locations for the public directory
  // This handles both development and production bundled builds
  const possiblePaths = [
    path.resolve(__dirname, "public"),           // Bundled: dist/public (relative to dist/index.cjs)
    path.resolve(process.cwd(), "dist/public"),  // From project root
    path.resolve(process.cwd(), "public"),       // Direct public folder
    path.resolve(__dirname, "../dist/public"),   // Alternative bundled location
    path.resolve(__dirname, "../public"),        // Workspace relative
    "/workspace/dist/public",                    // DigitalOcean workspace path
  ];

  console.log("[static] Checking paths for index.html:");
  
  let distPath: string | null = null;
  for (const p of possiblePaths) {
    const exists = fs.existsSync(p);
    const indexExists = exists && fs.existsSync(path.join(p, "index.html"));
    console.log(`[static]   ${p} - exists: ${exists}, has index.html: ${indexExists}`);
    
    if (indexExists) {
      distPath = p;
      console.log(`[static] ✓ Using: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    // List what's in cwd and __dirname to help debug
    console.error("[static] Could not find static files!");
    try {
      console.log("[static] Contents of cwd:", fs.readdirSync(process.cwd()));
      console.log("[static] Contents of __dirname:", fs.readdirSync(__dirname));
    } catch (e) {
      console.error("[static] Error listing directories:", e);
    }
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
