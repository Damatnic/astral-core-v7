# 🗄️ Database Configuration Guide - Phase 2

**Project**: Astral Core v7  
**Phase**: 2 - Database Configuration  
**Database**: PostgreSQL via Vercel  
**Created**: 2025-09-12

---

## 📋 Overview

This guide walks you through setting up a PostgreSQL database instance in Vercel for your Astral Core v7 application. Follow these steps carefully to ensure proper database connectivity.

## 🎯 Prerequisites

- [x] Phase 1 completed (Environment keys generated)
- [ ] Vercel account with project access
- [ ] Admin permissions for the Astral Core v7 project

---

## 🚀 Step-by-Step Instructions

### Step 1: Access Vercel Dashboard

1. **Navigate to Vercel Dashboard**
   - Open your browser and go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Sign in with your Vercel account credentials

2. **Locate Your Project**
   - Find the "astral-core-v7" project in your dashboard
   - Click on the project name to enter the project overview

### Step 2: Create PostgreSQL Database Instance

1. **Access Storage Tab**
   - In your project dashboard, click on the **"Storage"** tab in the top navigation
   - If you don't see the Storage tab, look for **"Integrations"** → **"Browse Marketplace"**

2. **Add PostgreSQL Database**
   - Click **"Create Database"** or **"Add Database"**
   - Select **"Postgres"** from the database options
   - Choose your preferred region (recommend: same as your deployment region)

3. **Configure Database Instance**
   ```
   Database Name: astral-core-v7-db
   Region: [Select closest to your users]
   Plan: Hobby (for development) or Pro (for production)
   ```

4. **Confirm Creation**
   - Review your selections
   - Click **"Create"** to provision the database
   - Wait for the database to be provisioned (usually 1-2 minutes)

### Step 3: Configure Database Connection Settings

1. **Access Database Settings**
   - Once created, click on your new database instance
   - Navigate to the **"Settings"** tab within the database view

2. **Connection Pooling (Recommended)**
   - Enable **Connection Pooling** for better performance
   - Set pool size based on your plan:
     - Hobby: 20 connections
     - Pro: 100+ connections

3. **Connection Security**
   - Ensure **SSL Mode** is set to "require"
   - Note the **Connection Limit** for your plan

### Step 4: Retrieve Database Connection Strings

1. **Navigate to Overview Tab**
   - In your database instance, go to the **"Overview"** tab
   - Look for the **"Connection String"** section

2. **Copy Connection Strings**
   You'll find several connection string formats. Copy these values:

   **Direct Connection (POSTGRES_URL):**
   ```
   postgresql://username:password@host:port/database?sslmode=require
   ```

   **Connection Pool (POSTGRES_URL_NON_POOLING):**
   ```
   postgresql://username:password@host:port/database?sslmode=require&pgbouncer=true
   ```

   **Prisma URL (POSTGRES_PRISMA_URL):**
   ```
   postgresql://username:password@host:port/database?sslmode=require&pgbouncer=true&connect_timeout=15
   ```

3. **Individual Components**
   Also note these individual values for backup:
   - **Host**: your-db-host.postgres.vercel-storage.com
   - **Port**: 5432
   - **Database**: your-database-name
   - **Username**: your-username
   - **Password**: [hidden - copy from connection string]

### Step 5: Test Database Connectivity

1. **Run the Test Script**
   ```bash
   cd "H:\Astral Core\astral-core-v7"
   node scripts/test-db-connection.js
   ```

2. **Verify Connection**
   - The script will attempt to connect using your environment variables
   - Check for successful connection messages
   - Verify database schema access

---

## 🔧 Environment Variables Required

Add these to your Vercel project environment variables:

```env
# Primary Database URL (with connection pooling)
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require&pgbouncer=true"

# Direct Database URL (without pooling, for migrations)
DIRECT_DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Alternative naming (if required by your app)
POSTGRES_URL="postgresql://username:password@host:port/database?sslmode=require&pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://username:password@host:port/database?sslmode=require"
POSTGRES_PRISMA_URL="postgresql://username:password@host:port/database?sslmode=require&pgbouncer=true&connect_timeout=15"
```

---

## 🔍 Verification Checklist

After completing the setup, verify:

- [ ] Database instance is **"Active"** in Vercel dashboard
- [ ] Connection strings are copied and stored securely
- [ ] Test script runs without errors
- [ ] Environment variables are prepared for Phase 3
- [ ] Database region matches your deployment region
- [ ] SSL connection is enforced
- [ ] Connection pooling is configured

---

## 🚨 Troubleshooting

### Common Issues:

1. **Connection Timeout**
   - Check if your IP is whitelisted (Vercel Postgres auto-allows)
   - Verify connection string format
   - Ensure SSL mode is set correctly

2. **Authentication Failed**
   - Double-check username and password in connection string
   - Ensure special characters are URL-encoded

3. **Database Not Found**
   - Verify database name in connection string
   - Check if database was fully provisioned

4. **Connection Pool Exhausted**
   - Review your connection pooling settings
   - Check for connection leaks in your application

### Getting Help:

- Check Vercel documentation: [https://vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)
- Review database logs in Vercel dashboard
- Run the test script with debug flags for detailed output

---

## 📝 Next Steps

Once database setup is complete:

1. **Proceed to Phase 3**: Environment Variables configuration
2. **Update environment variables** in Vercel project settings
3. **Run database migrations** in Phase 4
4. **Test full application connectivity**

---

## 🛡️ Security Notes

- Never commit connection strings to version control
- Use environment variables for all database credentials
- Regularly rotate database passwords
- Monitor database access logs
- Keep database instances updated

---

**Status**: ✅ Database setup guide created  
**Next Action**: Run test script and proceed to Phase 3