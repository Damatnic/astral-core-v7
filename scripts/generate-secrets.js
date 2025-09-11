#!/usr/bin/env node

/**
 * Generate Secure Secrets for Astral Core v7
 * Run this to generate all required secret keys
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🔐 Astral Core v7 - Secret Generator                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`${colors.yellow}Generating secure secrets for your deployment...${colors.reset}\n`);

// Generate secrets
const secrets = {
  NEXTAUTH_SECRET: crypto.randomBytes(32).toString('base64'),
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  JWT_SIGNING_KEY: crypto.randomBytes(32).toString('base64')
};

// Display secrets
console.log(`${colors.green}${colors.bright}✅ Secrets Generated Successfully!${colors.reset}\n`);
console.log('=' .repeat(70));
console.log(`${colors.bright}COPY AND PASTE THESE INTO VERCEL:${colors.reset}`);
console.log('=' .repeat(70));

// Format for easy copying
const envFormat = `
# ============================================
# 🔐 GENERATED SECRETS - COPY ALL OF THIS
# ============================================

NEXTAUTH_SECRET=${secrets.NEXTAUTH_SECRET}
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}
JWT_SIGNING_KEY=${secrets.JWT_SIGNING_KEY}

# ============================================
# 📝 DATABASE CONFIGURATION (You need to add)
# ============================================

DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require
DIRECT_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require

# ============================================
# 🔧 FIXED CONFIGURATION (Copy as-is)
# ============================================

NEXTAUTH_URL=https://astral-core-v7.vercel.app
NEXT_PUBLIC_APP_URL=https://astral-core-v7.vercel.app
NEXT_PUBLIC_APP_NAME=Astral Core
NEXT_PUBLIC_APP_VERSION=7.0.0
NODE_ENV=production
PHI_ENCRYPTION_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555
SESSION_TIMEOUT_MINUTES=15
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=50
REQUIRE_MFA=false
ENABLE_CRISIS_INTERVENTION=true
ENABLE_AI_ASSISTANCE=false
ENABLE_VIDEO_SESSIONS=false
ENABLE_GROUP_THERAPY=false
STORAGE_PROVIDER=local
EMAIL_FROM=noreply@astralcore.app
EMAIL_PROVIDER=resend`;

console.log(envFormat);

// Save to file
const outputPath = path.join(process.cwd(), '.env.generated');
fs.writeFileSync(outputPath, envFormat);

console.log('\n' + '=' .repeat(70));
console.log(`${colors.green}📁 Saved to: ${outputPath}${colors.reset}`);
console.log('=' .repeat(70));

// Instructions
console.log(`
${colors.cyan}${colors.bright}📋 WHAT TO DO NEXT:${colors.reset}

${colors.yellow}1. DATABASE SETUP:${colors.reset}
   ${colors.blue}Option A: Neon (Free)${colors.reset}
   • Sign up at: https://neon.tech
   • Create database: astralcore_v7
   • Copy connection string
   
   ${colors.blue}Option B: Supabase (Free)${colors.reset}
   • Sign up at: https://supabase.com
   • Create project: astral-core-v7
   • Copy connection strings

${colors.yellow}2. VERCEL SETUP:${colors.reset}
   • Go to: ${colors.cyan}https://vercel.com/new${colors.reset}
   • Import: ${colors.cyan}https://github.com/Damatnic/astral-core-v7${colors.reset}
   • Click "Environment Variables"
   • Paste everything from above
   • Add your database URLs
   • Click "Deploy"

${colors.yellow}3. OPTIONAL - STRIPE (For Payments):${colors.reset}
   • Go to: ${colors.cyan}https://dashboard.stripe.com/test/apikeys${colors.reset}
   • Copy your keys and add:
   
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

${colors.yellow}4. OPTIONAL - EMAIL (Resend):${colors.reset}
   • Go to: ${colors.cyan}https://resend.com/api-keys${colors.reset}
   • Create API key and add:
   
   RESEND_API_KEY=re_...

${colors.green}${colors.bright}✨ Your app will be live at: https://astral-core-v7.vercel.app${colors.reset}
`);

console.log('=' .repeat(70));
console.log(`${colors.magenta}${colors.bright}🚀 Ready to deploy! Follow the steps above.${colors.reset}`);
console.log('=' .repeat(70));

// Create a simple HTML file with instructions
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Astral Core v7 - Deployment Secrets</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .secret-box {
            background: #f4f4f4;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            word-break: break-all;
        }
        .copy-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
        .copy-btn:hover {
            background: #5a67d8;
        }
        .step {
            background: #f9f9f9;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Astral Core v7 - Deployment Secrets</h1>
        
        <div class="warning">
            <strong>⚠️ Security Warning:</strong> These are your secret keys. Never share them publicly or commit them to GitHub!
        </div>

        <h2>Generated Secrets</h2>
        <div class="secret-box" id="secrets">
NEXTAUTH_SECRET=${secrets.NEXTAUTH_SECRET}
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}
JWT_SIGNING_KEY=${secrets.JWT_SIGNING_KEY}</div>
        <button class="copy-btn" onclick="copySecrets()">📋 Copy Secrets</button>

        <h2>📋 Quick Setup Steps</h2>
        
        <div class="step">
            <h3>Step 1: Database Setup</h3>
            <p><strong>Option A: Neon (Recommended)</strong></p>
            <ol>
                <li>Go to <a href="https://neon.tech" target="_blank">neon.tech</a></li>
                <li>Create database: <code>astralcore_v7</code></li>
                <li>Copy the connection string</li>
            </ol>
        </div>

        <div class="step">
            <h3>Step 2: Deploy to Vercel</h3>
            <ol>
                <li>Go to <a href="https://vercel.com/new" target="_blank">vercel.com/new</a></li>
                <li>Import: <code>https://github.com/Damatnic/astral-core-v7</code></li>
                <li>Add environment variables (paste the secrets above)</li>
                <li>Add your database URL</li>
                <li>Click "Deploy"</li>
            </ol>
        </div>

        <div class="step">
            <h3>Step 3: Your App is Live!</h3>
            <p>Your app will be available at: <a href="https://astral-core-v7.vercel.app" target="_blank">https://astral-core-v7.vercel.app</a></p>
        </div>

        <h2>📧 Demo Accounts</h2>
        <div class="secret-box">
Admin: admin@demo.astralcore.com / Demo123!Admin
Therapist: therapist@demo.astralcore.com / Demo123!Therapist
Client: client@demo.astralcore.com / Demo123!Client</div>
    </div>

    <script>
        function copySecrets() {
            const secrets = document.getElementById('secrets').innerText;
            navigator.clipboard.writeText(secrets).then(() => {
                alert('✅ Secrets copied to clipboard!');
            });
        }
    </script>
</body>
</html>`;

const htmlPath = path.join(process.cwd(), 'deployment-secrets.html');
fs.writeFileSync(htmlPath, htmlContent);

console.log(`${colors.cyan}📄 HTML guide saved to: ${htmlPath}${colors.reset}`);
console.log(`${colors.yellow}   Open this file in your browser for a visual guide${colors.reset}\n`);