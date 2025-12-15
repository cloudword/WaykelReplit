import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import MemoryStore from "memorystore";
import pgSession from "connect-pg-simple";
import { Pool } from "pg";
import { storage, sanitizeRequestBody } from "./storage";
import { globalLimiter } from "./rate-limiter";

const app = express();
const httpServer = createServer(app);

// Process-level error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit in production - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production - log and continue
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    user: {
      id: string;
      role: string;
      isSuperAdmin?: boolean;
      transporterId?: string;
    };
  }
}

const MemoryStoreSession = MemoryStore(session);
const PgSessionStore = pgSession(session);

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is required in production");
}
if (!sessionSecret) {
  console.warn("WARNING: SESSION_SECRET not set. Using a randomly generated secret for development.");
}

// CORS middleware for customer portal
// CUSTOMER_PORTAL_URL can be comma-separated for multiple origins
const customerPortalUrls = (process.env.CUSTOMER_PORTAL_URL || '').split(',').map(u => u.trim()).filter(Boolean);
const ALLOWED_ORIGINS = [
  ...customerPortalUrls,
  'https://www.waykel.com',
  'https://waykel.com',
  'https://dev.waykel.com',
  'https://www.dev.waykel.com',
  'http://www.waykel.com',
  'http://waykel.com',
  'http://dev.waykel.com',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Trust proxy when running behind a reverse proxy (Replit, Heroku, etc.)
// This is required for secure cookies to work correctly
if (process.env.REPL_ID || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Determine if we need cross-origin cookie settings
// Only enable secure cookies for production deployments, not development previews
const isProduction = process.env.NODE_ENV === "production";
const needsCrossOriginCookies = isProduction || !!process.env.CUSTOMER_PORTAL_URL;

// Create session store
// Production: Use PostgreSQL for persistent sessions (with SSL for DigitalOcean)
// Development: Use MemoryStore
const createSessionStore = () => {
  if (isProduction && process.env.DATABASE_URL) {
    console.log("Using PostgreSQL session store for production");
    
    // SSL configuration: NODE_EXTRA_CA_CERTS > DIGITALOCEAN_CA_PATH > fallback
    const fs = require('fs');
    const path = require('path');
    let sslConfig: { ca?: string; rejectUnauthorized: boolean } | boolean = false;
    
    // In development, skip SSL for local databases
    if (process.env.DATABASE_URL.includes('localhost')) {
      sslConfig = false;
      console.log('[session] Using non-SSL connection for local database');
    } else if (process.env.NODE_EXTRA_CA_CERTS) {
      // Node.js automatically loads the CA from NODE_EXTRA_CA_CERTS
      sslConfig = { rejectUnauthorized: true };
      console.log("[session] Using NODE_EXTRA_CA_CERTS for SSL verification");
    } else {
      // Fallback: manually load CA certificate
      const DEFAULT_CA_PATH = './certs/digitalocean-ca.crt';
      const caPath = path.resolve(process.cwd(), process.env.DIGITALOCEAN_CA_PATH || DEFAULT_CA_PATH);
      
      if (fs.existsSync(caPath)) {
        try {
          const ca = fs.readFileSync(caPath, 'utf8');
          sslConfig = { ca, rejectUnauthorized: true };
          console.log("[session] Using DigitalOcean CA certificate for SSL");
        } catch (err) {
          console.warn("[session] Could not read CA file, using rejectUnauthorized: false");
          sslConfig = { rejectUnauthorized: false };
        }
      } else {
        console.warn("[session] CA certificate not found, using rejectUnauthorized: false");
        sslConfig = { rejectUnauthorized: false };
      }
    }
    
    const sessionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 3, // Reduced to prevent pool exhaustion
      min: 1,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 5000,
      allowExitOnIdle: false,
    });
    
    sessionPool.on("error", (err) => {
      console.error("[session] Pool error:", err.message);
    });
    
    return new PgSessionStore({
      pool: sessionPool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15,
      errorLog: (err) => {
        console.error('[session] Store error:', err.message);
      },
    });
  }
  
  console.log("Using MemoryStore for sessions (development)");
  return new MemoryStoreSession({ checkPeriod: 86400000 });
};

app.use(
  session({
    secret: sessionSecret || require("crypto").randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    store: createSessionStore(),
    cookie: {
      secure: isProduction, // Only require HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: needsCrossOriginCookies ? "none" : "lax",
    },
  })
);

// Global rate limiter - applies to all API routes
app.use(globalLimiter);

// Request body size limits to prevent large payload attacks
app.use(
  express.json({
    limit: '1mb', // Limit JSON body size
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '1mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
      
      const origin = req.headers.origin || '';
      const currentHost = `${req.protocol}://${req.headers.host}`;
      const isExternal = origin !== '' && origin !== currentHost && !origin.includes('localhost');
      
      const user = req.session?.user;
      
      storage.createApiLog({
        method: req.method,
        path: path,
        statusCode: res.statusCode,
        userId: user?.id || null,
        userRole: user?.role || null,
        origin: origin || null,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        requestBody: req.body ? sanitizeRequestBody(req.body) : null,
        responseTime: duration,
        errorMessage: res.statusCode >= 400 && capturedJsonResponse?.error 
          ? String(capturedJsonResponse.error) 
          : null,
        isExternal,
      }).catch((err) => {
        console.error('Failed to log API request:', err);
      });
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    try {
      serveStatic(app);
    } catch (error) {
      console.error("[static] Failed to set up static file serving:", error);
      // Still serve API endpoints even if static files fail
      app.use("*", (_req, res) => {
        res.status(503).json({ 
          error: "Frontend not available", 
          message: "Static files could not be loaded. API endpoints are still available at /api/*"
        });
      });
    }
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
