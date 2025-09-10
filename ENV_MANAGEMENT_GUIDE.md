# 🔐 Environment Variables Management Guide

## 📋 Overview

This project uses a streamlined environment variable management system that makes it easy to sync your local environment with Vercel.

## 🗂️ File Structure

```
astral-core-v7/
├── .env.local           # Local development (git-ignored)
├── .env.production      # Production template (committed)
├── scripts/
│   ├── sync-env-to-vercel.js    # Node.js sync script
│   └── sync-env-to-vercel.ps1   # PowerShell sync script
└── .github/workflows/
    └── sync-env-vars.yml         # Automated GitHub Action
```

## 🚀 Quick Start: Sync to Vercel

### Option 1: Automated Sync (Recommended)

#### Prerequisites
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to your Vercel account
vercel login

# Link this project to Vercel
vercel link
```

#### Run Sync Script

**For Windows (PowerShell):**
```powershell
.\scripts\sync-env-to-vercel.ps1
```

**For Mac/Linux/Windows (Node.js):**
```bash
node scripts/sync-env-to-vercel.js
```

### Option 2: Manual Commands

Generate the commands to run manually:
```bash
node scripts/sync-env-to-vercel.js --manual
```

Then copy and run each command in your terminal.

### Option 3: GitHub Actions (Automated CI/CD)

1. Go to your GitHub repository settings
2. Navigate to Secrets and Variables → Actions
3. Add these secrets:
   - `VERCEL_ORG_ID` - Found in Vercel project settings
   - `VERCEL_PROJECT_ID` - Found in Vercel project settings  
   - `VERCEL_TOKEN` - Generate at https://vercel.com/account/tokens

Now, whenever you update `.env.production` and push to GitHub, the variables will auto-sync to Vercel!

## 📝 Environment Files Explained

### `.env.local` (Development)
- Used for local development
- Never committed to Git
- Contains all your actual keys and secrets

### `.env.production` (Template)
- Template for production variables
- Committed to Git (be careful with secrets!)
- Used by sync scripts to push to Vercel

### `.env` (Fallback)
- Default values for all environments
- Committed to Git
- Only non-sensitive defaults

## 🔄 Workflow

### Adding New Environment Variables

1. **Add to `.env.local`** for local testing:
```env
NEW_API_KEY="your-actual-key-here"
```

2. **Add to `.env.production`** for deployment:
```env
NEW_API_KEY="your-actual-key-here"
```

3. **Sync to Vercel**:
```bash
node scripts/sync-env-to-vercel.js
```

4. **Redeploy** on Vercel to use new variables

### Updating Existing Variables

1. Update in `.env.production`
2. Run sync script
3. Vercel will automatically redeploy

## 🛠️ Troubleshooting

### "Vercel CLI not found"
```bash
npm i -g vercel
vercel login
```

### "Project not linked"
```bash
vercel link
# Follow the prompts to select your project
```

### "Variable already exists"
This is normal! The script will skip existing variables. To update them:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Delete the old variable
3. Run the sync script again

### "Permission denied" (PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🔒 Security Best Practices

### DO ✅
- Use different API keys for development and production
- Keep `.env.local` in `.gitignore`
- Use Vercel's environment variable UI for sensitive production values
- Rotate keys regularly
- Use separate Stripe test and live keys

### DON'T ❌
- Commit real API keys to `.env.production` if the repo is public
- Share your `.env.local` file
- Use production keys in development
- Hardcode secrets in your code

## 📊 Current Variables

Your project uses these environment variables:

| Category | Variables | Required |
|----------|-----------|----------|
| **Database** | `DATABASE_URL`, `DIRECT_URL` | ✅ Yes |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Yes |
| **Auth** | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `JWT_SECRET` | ✅ Yes |
| **Security** | `ENCRYPTION_KEY`, `AUDIT_LOG_KEY` | ✅ Yes |
| **AI** | `OPENAI_API_KEY`, `GEMINI_API_KEY` | ⚠️ Optional |
| **Stack Auth** | `NEXT_PUBLIC_STACK_PROJECT_ID`, etc. | ⚠️ Optional |

## 🚦 Verification

After syncing, verify your variables:

1. **Vercel Dashboard**: https://vercel.com/dashboard
2. Navigate to: Your Project → Settings → Environment Variables
3. Check all variables are present
4. Trigger a redeploy to apply changes

## 💡 Pro Tips

1. **Use Preview Environments**: Set different values for Preview vs Production in Vercel
2. **Environment-Specific Values**: 
   ```env
   NEXTAUTH_URL="http://localhost:3000"  # Development
   NEXTAUTH_URL="https://preview.vercel.app"  # Preview
   NEXTAUTH_URL="https://yourdomain.com"  # Production
   ```
3. **Backup Your Keys**: Keep a secure backup of your production keys
4. **Monitor Usage**: Check your API usage regularly (Stripe, OpenAI, etc.)

## 📞 Need Help?

- Check the build logs in Vercel Dashboard
- Review this guide
- Check `.env.example` for required variables
- Ensure all variables in code have fallbacks

---

*Last Updated: Generated by Environment Management System*