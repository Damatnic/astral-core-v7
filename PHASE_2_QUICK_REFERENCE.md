# 🚀 Phase 2 Quick Reference - Database Setup

**Time Required**: 10-15 minutes  
**Skills Required**: Basic Vercel dashboard navigation  

---

## 📋 Quick Steps

1. **Vercel Dashboard** → https://vercel.com/dashboard
2. **Find Project** → "astral-core-v7"
3. **Storage Tab** → "Create Database" → "Postgres"
4. **Configure**: Name: `astral-core-v7-db`, Enable SSL, Choose region
5. **Copy Connection Strings** (3 types needed)
6. **Test Connection** → Run: `node scripts/test-db-connection.js`

---

## 🔗 Connection Strings Format

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
POSTGRES_PRISMA_URL="postgresql://user:pass@host:5432/db?sslmode=require&pgbouncer=true&connect_timeout=15"
```

---

## ✅ Success Indicators

- [ ] Database shows "Active" status in Vercel
- [ ] All connection strings copied
- [ ] Test script runs without errors: `✅ All tests passed!`
- [ ] Ready for Phase 3 (Environment Variables)

---

## 🆘 Quick Troubleshooting

- **Connection timeout**: Check SSL settings and region
- **Auth failed**: Verify username/password in connection string
- **Test fails**: Ensure .env file has DATABASE_URL set

---

**Next**: Phase 3 - Add these connection strings to Vercel environment variables