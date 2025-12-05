# Waykel - Environment Configuration

This document describes how to set up and manage different environments for the Waykel logistics platform.

## Environments

| Environment | Purpose | Database | URL |
|-------------|---------|----------|-----|
| **Development** | Local development | Dev PostgreSQL | `localhost:5000` |
| **Staging** | Testing before production | Staging PostgreSQL | `staging.waykel.com` |
| **Production** | Live application | Production PostgreSQL | `waykel.com` |

## Environment Variables

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# App Configuration
NODE_ENV=development|staging|production
PORT=5000
API_BASE_URL=http://localhost:5000

# Optional: Payment Integration
STRIPE_SECRET_KEY=sk_test_xxx
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Optional: Maps Integration
GOOGLE_MAPS_API_KEY=xxx

# Optional: Push Notifications
FCM_SERVER_KEY=xxx
APNS_KEY_ID=xxx
```

## GitHub Branch Strategy

```
main (production)
  └── staging
       └── develop
            └── feature/xxx
```

### Branch Descriptions:
- **main**: Production-ready code, auto-deploys to production
- **staging**: Pre-production testing, auto-deploys to staging server
- **develop**: Active development, team integration branch
- **feature/xxx**: Individual feature branches

## Setting Up Environments

### 1. Development (Local)
```bash
# Clone the repository
git clone https://github.com/cloudword/waykelreplit.git
cd waykelreplit

# Install dependencies
npm install

# Set up environment
cp .env.example .env.development
# Edit .env.development with your local database credentials

# Run database migrations
npm run db:push

# Seed test data
npx tsx server/seed.ts

# Start development server
npm run dev
```

### 2. Staging
```bash
# Create staging branch
git checkout -b staging
git push origin staging

# Set up staging environment variables in your hosting platform
# - DATABASE_URL: Staging database connection string
# - NODE_ENV: staging
# - API_BASE_URL: https://staging.waykel.com
```

### 3. Production
```bash
# Merge staging to main when ready
git checkout main
git merge staging
git push origin main

# Set up production environment variables
# - DATABASE_URL: Production database connection string
# - NODE_ENV: production
# - API_BASE_URL: https://waykel.com
```

## GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml` for automated deployments.

## Database Migrations

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:push

# Force push (careful!)
npm run db:push --force
```
