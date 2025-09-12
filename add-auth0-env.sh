#!/bin/bash

# Add Auth0 environment variables to Vercel
echo "your-generated-auth0-secret-here" | vercel env add AUTH0_SECRET production
echo "https://astral-core-v7.vercel.app" | vercel env add AUTH0_BASE_URL production  
echo "https://dev-ac3ajs327vs5vzhk.us.auth0.com" | vercel env add AUTH0_ISSUER_BASE_URL production
echo "7ivKaost2wsuV47x6dAyj11Eo7jpcctX" | vercel env add AUTH0_CLIENT_ID production
echo "A7ABJwRg7n0otizVohWj15UN2zjEl5lbSW7sBlXPgvqsU0FPvyQmobUA0pQ8OiJo" | vercel env add AUTH0_CLIENT_SECRET production

echo "Auth0 environment variables added to Vercel!"