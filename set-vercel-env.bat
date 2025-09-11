@echo off
echo Setting Vercel environment variables...

vercel env add NEXTAUTH_URL production < nul & echo https://astral-core-v7.vercel.app | vercel env add NEXTAUTH_URL production
vercel env add DATABASE_URL production < nul & echo postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require | vercel env add DATABASE_URL production
vercel env add DIRECT_URL production < nul & echo postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require | vercel env add DIRECT_URL production
vercel env add NEXTAUTH_SECRET production < nul & echo tUN2VrCEJ2nkcq78H7WYYjMDoGgOvdEujCdrlCGIu8A= | vercel env add NEXTAUTH_SECRET production
vercel env add ENCRYPTION_KEY production < nul & echo 3598a3a4c2e8075f0226b402b2fc39e58f50cbe0a095e67919a60839e943a615 | vercel env add ENCRYPTION_KEY production
vercel env add JWT_SIGNING_KEY production < nul & echo zYwLMsTPzwGiIYv2eTBrYyZg6+xohlhVtXUJlYj+bRI= | vercel env add JWT_SIGNING_KEY production
vercel env add NEXT_PUBLIC_APP_URL production < nul & echo https://astral-core-v7.vercel.app | vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_APP_NAME production < nul & echo Astral Core | vercel env add NEXT_PUBLIC_APP_NAME production
vercel env add NEXT_PUBLIC_APP_VERSION production < nul & echo 7.0.0 | vercel env add NEXT_PUBLIC_APP_VERSION production
vercel env add NODE_ENV production < nul & echo production | vercel env add NODE_ENV production
vercel env add PHI_ENCRYPTION_ENABLED production < nul & echo true | vercel env add PHI_ENCRYPTION_ENABLED production
vercel env add AUDIT_LOG_RETENTION_DAYS production < nul & echo 2555 | vercel env add AUDIT_LOG_RETENTION_DAYS production
vercel env add SESSION_TIMEOUT_MINUTES production < nul & echo 15 | vercel env add SESSION_TIMEOUT_MINUTES production
vercel env add MAX_LOGIN_ATTEMPTS production < nul & echo 5 | vercel env add MAX_LOGIN_ATTEMPTS production
vercel env add LOCKOUT_DURATION_MINUTES production < nul & echo 15 | vercel env add LOCKOUT_DURATION_MINUTES production
vercel env add RATE_LIMIT_WINDOW_MS production < nul & echo 60000 | vercel env add RATE_LIMIT_WINDOW_MS production
vercel env add RATE_LIMIT_MAX_REQUESTS production < nul & echo 50 | vercel env add RATE_LIMIT_MAX_REQUESTS production
vercel env add REQUIRE_MFA production < nul & echo false | vercel env add REQUIRE_MFA production
vercel env add ENABLE_CRISIS_INTERVENTION production < nul & echo true | vercel env add ENABLE_CRISIS_INTERVENTION production
vercel env add ENABLE_AI_ASSISTANCE production < nul & echo false | vercel env add ENABLE_AI_ASSISTANCE production
vercel env add ENABLE_VIDEO_SESSIONS production < nul & echo false | vercel env add ENABLE_VIDEO_SESSIONS production
vercel env add ENABLE_GROUP_THERAPY production < nul & echo false | vercel env add ENABLE_GROUP_THERAPY production
vercel env add STORAGE_PROVIDER production < nul & echo local | vercel env add STORAGE_PROVIDER production
vercel env add EMAIL_FROM production < nul & echo noreply@astralcore.app | vercel env add EMAIL_FROM production
vercel env add EMAIL_PROVIDER production < nul & echo resend | vercel env add EMAIL_PROVIDER production

echo Done setting environment variables!
