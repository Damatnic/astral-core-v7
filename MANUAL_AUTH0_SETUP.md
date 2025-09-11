# Manual Auth0 Setup Guide

## 🚨 Issue with Automated Setup

The automated setup script fails because the Auth0 application needs to be configured in the dashboard first. The error shows:

```
Grant type 'client_credentials' not allowed for the client
```

This means the Auth0 application isn't properly configured for the Management API.

## 🔧 Manual Steps Required

### Step 1: Configure Auth0 Application in Dashboard

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications** → Select your application: `7ivKaost2wsuV47x6dAyj11Eo7jpcctX`
3. Go to **Settings** tab

### Step 2: Application Settings

Set these values in the Auth0 dashboard:

**Basic Information:**
- Name: `Astral Core v7 (Production)`
- Application Type: `Single Page Application`

**Application URIs:**
- Allowed Callback URLs:
  ```
  https://astral-core-v7.vercel.app/api/auth/callback/auth0,
  https://astral-core-v7-git-main.vercel.app/api/auth/callback/auth0,
  https://astral-core-v7-git-master.vercel.app/api/auth/callback/auth0,
  http://localhost:3000/api/auth/callback/auth0
  ```

- Allowed Logout URLs:
  ```
  https://astral-core-v7.vercel.app,
  https://astral-core-v7-git-main.vercel.app,
  https://astral-core-v7-git-master.vercel.app,
  http://localhost:3000
  ```

- Allowed Web Origins:
  ```
  https://astral-core-v7.vercel.app,
  https://astral-core-v7-git-main.vercel.app,
  https://astral-core-v7-git-master.vercel.app,
  http://localhost:3000
  ```

- Allowed Origins (CORS):
  ```
  https://astral-core-v7.vercel.app,
  https://astral-core-v7-git-main.vercel.app,
  https://astral-core-v7-git-master.vercel.app,
  http://localhost:3000
  ```

### Step 3: Advanced Settings

**OAuth:**
- JsonWebToken Signature Algorithm: `RS256`
- OIDC Conformant: `✅ Enabled`

**Grant Types:**
- ✅ Authorization Code
- ✅ Refresh Token
- ❌ Implicit (disable this)
- ❌ Password (disable this)

**Application Metadata:**
```json
{
  "environment": "production",
  "auto_configured": "manual",
  "configuration_date": "2025-09-11"
}
```

### Step 4: Enable Management API (Optional)

If you want to use automation scripts in the future:

1. Go to **APIs** → **Auth0 Management API**
2. Go to **Machine to Machine Applications**
3. Authorize your application `7ivKaost2wsuV47x6dAyj11Eo7jpcctX`
4. Select these scopes:
   - `read:clients`
   - `update:clients`
   - `read:client_grants`
   - `update:client_grants`

## 🎯 Current Configuration

Your `.env.local` should have:
```bash
AUTH0_SECRET=your-secret-here
AUTH0_BASE_URL=https://astral-core-v7.vercel.app
AUTH0_ISSUER_BASE_URL=https://dev-ac3ajs327vs5vzhk.us.auth0.com
AUTH0_CLIENT_ID=7ivKaost2wsuV47x6dAyj11Eo7jpcctX
AUTH0_CLIENT_SECRET=A7ABJwRg7n0otizVohWj15UN2zjEl5lbSW7sBlXPgvqsU0FPvyQmobUA0pQ8OiJo
```

## ✅ Verification

Once configured, test the login at:
- https://astral-core-v7.vercel.app/api/auth/login

The automated scripts can be used later once the Management API is enabled.

## 🤖 Alternative: Use Automated Script After Manual Setup

After completing the manual setup above, you can run:
```bash
node scripts/auth0-auto-setup.js
```

This will work once the application is properly configured in the Auth0 dashboard.