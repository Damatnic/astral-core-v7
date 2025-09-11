# 🎭 Demo Accounts Guide - Astral Core v7

This guide provides demo login accounts for testing all user roles and features in the Astral Core v7 mental health platform.

## 🚀 Quick Setup

To create all demo accounts, run:
```bash
node scripts/create-demo-accounts.js
```

## 🔐 Demo Login Credentials

### 👑 **ADMIN Account**
- **Email**: `admin@demo.astralcore.com`
- **Password**: `Demo123!Admin`
- **Name**: Sarah Administrator
- **Features**:
  - Full system administration access
  - User management and system settings
  - Analytics and reporting dashboard
  - Error tracking and monitoring
  - Platform configuration

### 👨‍⚕️ **THERAPIST Account**
- **Email**: `therapist@demo.astralcore.com`
- **Password**: `Demo123!Therapist`
- **Name**: Dr. Michael Thompson
- **Features**:
  - Patient management and therapy sessions
  - Appointment scheduling
  - Treatment plan creation
  - Session notes and progress tracking
  - Crisis intervention tools
  - **License**: PSY-12345-CA (California)
  - **Specializations**: CBT, Trauma-Informed Care, Anxiety Disorders

### 👤 **CLIENT Account**
- **Email**: `client@demo.astralcore.com`
- **Password**: `Demo123!Client`
- **Name**: Emma Johnson
- **Features**:
  - Personal wellness tracking
  - Journal entries and mood logging
  - Appointment booking with therapists
  - Crisis support resources
  - Messaging with care team
  - **Demo Data**: Includes sample wellness data and journal entries

### 🚨 **CRISIS RESPONDER Account**
- **Email**: `crisis@demo.astralcore.com`
- **Password**: `Demo123!Crisis`
- **Name**: Alex Crisis-Response
- **Features**:
  - 24/7 crisis intervention access
  - Emergency assessment tools
  - Priority communication channels
  - Crisis resource management
  - Emergency escalation protocols

### 👥 **SUPERVISOR Account**
- **Email**: `supervisor@demo.astralcore.com`
- **Password**: `Demo123!Supervisor`
- **Name**: Dr. Rachel Supervisor
- **Features**:
  - Clinical supervision dashboard
  - Quality assurance monitoring
  - Staff performance reviews
  - Treatment plan oversight
  - Professional development tracking

## 🎯 Testing Scenarios

### **Admin Testing**
1. Log in as admin to access system dashboard
2. View error logs and performance metrics
3. Manage user accounts and permissions
4. Configure system settings
5. Generate platform reports

### **Therapist-Client Workflow**
1. Log in as therapist to view client list
2. Review Emma Johnson's (client) wellness data
3. Log in as client to book an appointment
4. Switch back to therapist to confirm appointment
5. Test messaging between therapist and client

### **Crisis Response Testing**
1. Log in as client and trigger a crisis assessment
2. Log in as crisis responder to handle intervention
3. Test emergency escalation procedures
4. Verify crisis resources accessibility

### **Supervision Workflow**
1. Log in as supervisor to review therapist performance
2. Check treatment plan quality assurance
3. Review client progress across the platform
4. Generate supervision reports

## 📊 Demo Data Included

### **Client Account Demo Data**:
- **Wellness Tracking**: Mood ratings, anxiety levels, sleep quality
- **Journal Entries**: 2 sample entries with mood tracking
- **Activities**: Meditation, journaling, exercise logs

### **Appointments**:
- Sample appointment scheduled between Dr. Thompson (therapist) and Emma Johnson (client)
- Type: Weekly Therapy Session
- Focus: Anxiety management and coping strategies

## 🔒 Security Notes

### **Development Only**
- These accounts are for **development and testing only**
- Never use these credentials in production
- All demo emails use `@demo.astralcore.com` domain

### **Password Requirements**
- All passwords follow the platform security requirements:
  - Minimum 8 characters
  - Contains uppercase and lowercase letters
  - Contains numbers and special characters
  - Follows the pattern: `Demo123![Role]`

## 🧪 Feature Testing Guide

### **Authentication Features**
- Multi-factor authentication setup
- Password reset functionality
- Account lockout protection
- Session management

### **Role-Based Access Control**
- Test different permission levels
- Verify feature access restrictions
- Check data visibility controls
- Test administrative privileges

### **Mental Health Features**
- Crisis assessment workflows
- Wellness tracking and analytics
- Therapy session management
- Emergency resource access

### **Platform Features**
- Dark mode toggle
- Accessibility features (keyboard navigation, screen reader support)
- Responsive design across devices
- Performance monitoring

## 🚀 Getting Started

1. **Run the setup script**:
   ```bash
   node scripts/create-demo-accounts.js
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Navigate to**: `http://localhost:3000/auth/login`

4. **Choose any demo account** and start exploring!

## 🆘 Troubleshooting

### **Account Creation Issues**
- Ensure database is connected and migrations are run
- Check that Prisma client is properly configured
- Verify environment variables are set

### **Login Issues**
- Confirm accounts were created successfully
- Check that passwords match exactly (case-sensitive)
- Verify email addresses are typed correctly

### **Permission Issues**
- Log out completely before switching accounts
- Clear browser cache if experiencing role confusion
- Check that user roles are properly assigned in database

## 📞 Support

If you encounter any issues with the demo accounts:
1. Check the console output when running the creation script
2. Verify database connection and schema
3. Ensure all environment variables are properly configured
4. Review the application logs for any authentication errors

---

**Happy Testing!** 🎉

These demo accounts provide a comprehensive way to test all aspects of the Astral Core v7 mental health platform across different user roles and scenarios.