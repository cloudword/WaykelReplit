# DigitalOcean Deployment Guide

This guide covers deploying Waykel to DigitalOcean App Platform with Managed PostgreSQL Database and Spaces Object Storage.

## Prerequisites

1. DigitalOcean account
2. GitHub repository with the Waykel codebase
3. DigitalOcean Managed PostgreSQL Database cluster
4. DigitalOcean Spaces bucket (optional, for file uploads)

## Step 1: Create Managed PostgreSQL Database

1. Go to **Databases** in DigitalOcean Control Panel
2. Click **Create Database Cluster**
3. Choose **PostgreSQL** (version 15 or later recommended)
4. Select your region (same as where you'll deploy the app)
5. Choose a plan based on your needs (Basic $15/mo works for starting)
6. Name your cluster (e.g., `waykel-db`)
7. Click **Create Database Cluster**

After creation:
1. Go to the database **Connection Details**
2. Copy the **Connection String** (you'll need this for `DATABASE_URL`)
3. Under **Trusted Sources**, add your App Platform app once created

## Step 2: Create Spaces Bucket (For File Uploads)

1. Go to **Spaces Object Storage** in DigitalOcean
2. Click **Create a Space**
3. Choose your region
4. Enable **CDN** for better performance (optional)
5. Set **File Listing** to Restricted
6. Name your space (e.g., `waykel-files`)
7. Click **Create a Space**

Generate Spaces Keys:
1. Go to **API** → **Spaces Keys**
2. Click **Generate New Key**
3. Copy the **Access Key** and **Secret Key** (store securely!)

## Step 3: Create App Platform App

1. Go to **Apps** in DigitalOcean
2. Click **Create App**
3. Connect your **GitHub** repository
4. Select the repository and branch (main/production)
5. DigitalOcean will auto-detect the Node.js app

### Configure Build & Run Settings

In the **Resources** section, configure your web service:

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install && npm run build` |
| **Run Command** | `./start.sh` |
| **HTTP Port** | `5000` |
| **Instance Size** | Basic ($5/mo) or higher |

### URL Rewrite for SPA (Required)

For single-page applications to work correctly, add a URL rewrite rule in your app spec:

1. Go to **Settings** → **App Spec**
2. Add this under your service component:

```yaml
routes:
  - path: /
    preserve_path_prefix: true
```

Or add a catch-all rewrite:
```yaml
routes:
  - path: /*
```

This ensures all routes are handled by your Node.js server instead of returning 404.

See [DigitalOcean URL Rewrites documentation](https://docs.digitalocean.com/products/app-platform/how-to/url-rewrites/) for more details.

### Configure Environment Variables

Go to **Settings** → **App-Level Environment Variables** and add:

#### Required Variables

| Variable | Value | Encrypt? |
|----------|-------|----------|
| `DATABASE_URL` | Your PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Random 32+ character string | Yes |
| `JWT_SECRET` | Random 32+ character string | Yes |
| `NODE_ENV` | `production` | No |
| `DIGITALOCEAN_CA_B64` | Base64-encoded CA certificate | Yes |

**SSL Certificate Setup**: 

The `start.sh` script decodes the CA certificate from `DIGITALOCEAN_CA_B64` at runtime. To set this up:

1. Download the CA certificate from DigitalOcean Dashboard → Databases → Connection Details
2. Base64 encode it: `cat ca-certificate.crt | base64 -w0`
3. Add the output as `DIGITALOCEAN_CA_B64` secret in App Platform

**Run Command**: Set to `./start.sh` (replaces `npm start`)

#### DigitalOcean Spaces (Optional - for file uploads)

| Variable | Value | Encrypt? |
|----------|-------|----------|
| `DO_SPACES_ENDPOINT` | `nyc3.digitaloceanspaces.com` (your region) | No |
| `DO_SPACES_KEY` | Your Spaces access key | Yes |
| `DO_SPACES_SECRET` | Your Spaces secret key | Yes |
| `DO_SPACES_BUCKET` | Your bucket name | No |
| `DO_SPACES_REGION` | `nyc3` (your region) | No |
| `PRIVATE_OBJECT_DIR` | `private` | No |
| `PUBLIC_OBJECT_DIR` | `public` | No |

#### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `CUSTOMER_PORTAL_URL` | `https://dev.waykel.com` | For CORS (comma-separated) |
| `PORT` | `5000` | Server port (usually auto-set) |

### Generate Secure Secrets

Use this command to generate secure random strings:

```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SECRET  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Database Migration

After first deployment, you need to run database migrations:

### Option A: Using App Platform Console

1. Go to your app in App Platform
2. Click **Console** tab
3. Run: `npm run db:push`

### Option B: Using Local Connection

1. Whitelist your IP in database **Trusted Sources**
2. Set `DATABASE_URL` locally
3. Run: `npm run db:push`

## Step 5: Create Super Admin User

After migrations, create the super admin:

1. Open App Platform **Console**
2. Run the following to check if super admin exists:

```bash
# The app auto-creates super admin on startup with these credentials:
# Phone: 8699957305
# Password: Waykel6@singh
```

If you need to reset or create manually, use the database:

```sql
-- Connect to your database and run:
-- The password hash is for "Waykel6@singh"
INSERT INTO users (id, name, phone, password, role, is_super_admin, status)
VALUES (
  gen_random_uuid(),
  'Super Admin',
  '8699957305',
  '$2b$10$...', -- Use bcrypt to hash your password
  'admin',
  true,
  'active'
);
```

## Step 6: Configure Domain (Optional)

1. Go to your app **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `api.waykel.com`)
4. Follow DNS configuration instructions
5. DigitalOcean will auto-provision SSL certificate

## Deployment Architecture (Recommended: Separate Frontend & Backend)

The recommended architecture separates the frontend and backend into different App Platform components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       DigitalOcean Cloud                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐      ┌─────────────────────────────────┐  │
│  │ Static Site         │      │  Web Service (Backend)           │  │
│  │ admin.waykel.com    │─────►│  api.waykel.com                  │  │
│  │                     │      │                                   │  │
│  │ - React SPA         │      │  - Node.js/Express API           │  │
│  │ - Admin Dashboard   │      │  - Session management            │  │
│  └─────────────────────┘      │  - JWT authentication            │  │
│                               └─────────────────────────────────┘  │
│  ┌─────────────────────┐                    │                       │
│  │ Static Site         │                    │                       │
│  │ www.waykel.com      │────────────────────┘                       │
│  │                     │                    │                       │
│  │ - Customer Portal   │                    ▼                       │
│  │ - waykelconnect     │      ┌─────────────────────────────────┐  │
│  └─────────────────────┘      │  Managed PostgreSQL              │  │
│                               │  - User data, Sessions           │  │
│                               │  - Rides, Bids, etc.             │  │
│                               └─────────────────────────────────┘  │
│                                             │                       │
│                                             ▼                       │
│                               ┌─────────────────────────────────┐  │
│                               │  Spaces (S3)                     │  │
│                               │  - Documents, Vehicle photos     │  │
│                               └─────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Separate Frontend & Backend?

1. **Independent Scaling** - Frontend can use CDN caching, backend can scale instances
2. **Faster Deployments** - Update frontend without touching backend
3. **CORS/Security** - Cleaner separation of concerns
4. **Cost Effective** - Static sites are cheaper than web services

### Configuring the Static Site (admin.waykel.com)

**CRITICAL: SPA Routing Configuration**

Static sites need a **catchall document** to handle client-side routing. Without this, direct navigation to routes like `/admin/customers` returns 404.

**Via DigitalOcean Dashboard:**
1. Go to **Apps** → select your app
2. Click on the **static site component** (e.g., "admin")
3. Go to **Settings** → **Component Settings**
4. Set **Catchall Document** to: `index.html`
5. Save and redeploy

**Via App Spec (app.yaml):**
```yaml
static_sites:
  - name: admin
    github:
      repo: your-org/waykel-dev
      branch: main
      deploy_on_push: true
    build_command: cd client && npm install && npm run build
    output_dir: client/dist/public
    catchall_document: index.html
    routes:
      - path: /
    envs:
      - key: VITE_API_BASE_URL
        scope: BUILD_TIME
        value: "https://api.waykel.com/api"
```

### Configuring the Backend Service (api.waykel.com)

```yaml
services:
  - name: api
    github:
      repo: your-org/waykel-dev
      branch: main
      deploy_on_push: true
    build_command: npm install && npm run build
    run_command: ./start.sh
    http_port: 5000
    instance_size_slug: basic-xxs
    instance_count: 1
    routes:
      - path: /
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
        value: "your-connection-string"
      - key: SESSION_SECRET
        scope: RUN_TIME
        type: SECRET
        value: "random-32-char-string"
      - key: JWT_SECRET
        scope: RUN_TIME
        type: SECRET
        value: "random-32-char-string"
      - key: NODE_ENV
        scope: RUN_TIME
        value: "production"
```

### Important Environment Variables

| Component | Variable | Value | When |
|-----------|----------|-------|------|
| Static Site | `VITE_API_BASE_URL` | `https://api.waykel.com/api` | Build time |
| Backend | `DATABASE_URL` | Connection string | Runtime |
| Backend | `SESSION_SECRET` | Random string | Runtime |
| Backend | `JWT_SECRET` | Random string | Runtime |
| Backend | `NODE_ENV` | `production` | Runtime |
| Backend | `CUSTOMER_PORTAL_URL` | `https://www.waykel.com` | Runtime |

### Troubleshooting SPA Routing

**Problem: 404 on page refresh or direct navigation**
- **Cause**: Static site not configured with catchall document
- **Fix**: Add `catchall_document: index.html` to static site config

**Problem: API calls going to wrong domain**
- **Cause**: `VITE_API_BASE_URL` not set during build
- **Fix**: Set build-time environment variable and rebuild

**Problem: CORS errors**
- **Cause**: Frontend domain not in backend CORS whitelist
- **Fix**: Add domain to `ALLOWED_ORIGINS` in `server/index.ts`

## Monitoring & Logs

### View Logs

1. Go to your app in App Platform
2. Click **Logs** tab (or **Runtime Logs**)
3. Filter by component if needed

### Alerts

1. Go to **Monitoring** → **Alerts**
2. Create alerts for:
   - High CPU usage
   - Database connection errors
   - HTTP 5xx errors
   - Memory usage

## Scaling

### Horizontal Scaling (More Instances)

1. Go to app **Settings** → **Resources**
2. Increase instance count
3. Sessions are stored in PostgreSQL, so scaling is seamless

### Vertical Scaling (Larger Instances)

1. Go to app **Settings** → **Resources**
2. Change to a larger instance size

### Database Scaling

1. Go to your database cluster
2. Resize to a larger plan
3. Add read replicas for read-heavy workloads

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if app is listening on correct port (5000)
   - Check runtime logs for startup errors

2. **Database Connection Failed**
   - Verify `DATABASE_URL` is correct
   - Check database is running and accessible
   - Ensure app IP is in Trusted Sources

3. **Session Not Persisting**
   - Verify `SESSION_SECRET` is set
   - Check PostgreSQL session table exists
   - Ensure cookies are being sent with `credentials: include`

4. **File Uploads Failing**
   - Verify all Spaces environment variables are set
   - Check Spaces bucket permissions
   - Verify CORS settings on bucket

### Health Check

The app provides a health endpoint:

```bash
curl https://your-app.ondigitalocean.app/api/health
```

## Cost Estimate

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| App Platform | Basic (1 instance) | $5-12 |
| Managed PostgreSQL | Basic | $15 |
| Spaces | 250GB included | $5 |
| **Total** | | **~$25-32/mo** |

## Security Checklist

- [ ] All secrets encrypted in App Platform
- [ ] Database SSL enabled
- [ ] Trusted Sources configured for database
- [ ] CORS properly configured
- [ ] Rate limiting enabled (built-in)
- [ ] HTTPS enforced (automatic with App Platform)

## Support

For issues specific to:
- **App Platform**: DigitalOcean Support
- **Waykel Application**: Check application logs first
- **Database**: DigitalOcean Database documentation
