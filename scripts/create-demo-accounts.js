#!/usr/bin/env node

/**
 * Demo Account Creation Script for Astral Core v7
 * Creates demo login accounts for all available user roles
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Demo account configurations
const DEMO_ACCOUNTS = [
  {
    role: 'ADMIN',
    email: 'admin@demo.astralcore.com',
    password: 'Demo123!Admin',
    name: 'Sarah Administrator',
    profile: {
      firstName: 'Sarah',
      lastName: 'Administrator',
      dateOfBirth: new Date('1985-06-15'),
      phoneNumber: '+1-555-ADMIN-01',
      address: '123 Admin Street, Tech City, TC 12345',
      city: 'Tech City',
      state: 'TC',
      zipCode: '12345',
      country: 'USA'
    }
  },
  {
    role: 'THERAPIST',
    email: 'therapist@demo.astralcore.com',
    password: 'Demo123!Therapist',
    name: 'Dr. Michael Thompson',
    profile: {
      firstName: 'Michael',
      lastName: 'Thompson',
      dateOfBirth: new Date('1980-03-22'),
      phoneNumber: '+1-555-THERAPY-1',
      address: '456 Wellness Avenue, Care City, CC 67890',
      city: 'Care City',
      state: 'CC',
      zipCode: '67890',
      country: 'USA'
    },
    therapistProfile: {
      licenseNumber: 'PSY-12345-CA',
      licenseState: 'CA',
      licenseExpiry: new Date('2025-12-31'),
      specializations: ['Cognitive Behavioral Therapy', 'Trauma-Informed Care', 'Anxiety Disorders'],
      education: [
        {
          degree: 'Ph.D. in Clinical Psychology',
          institution: 'UCLA',
          year: 2016,
          gpa: 3.8
        }
      ],
      certifications: [
        {
          name: 'Licensed Clinical Psychologist',
          issuer: 'California Board of Psychology',
          year: 2017,
          expiry: 2025
        }
      ],
      yearsOfExperience: 8,
      acceptingClients: true,
      hourlyRate: 150.00,
      insuranceAccepted: ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'UnitedHealth'],
      bio: 'Dr. Thompson has 8 years of experience helping individuals overcome anxiety, depression, and trauma. He uses evidence-based approaches including CBT and mindfulness techniques.'
    }
  },
  {
    role: 'CLIENT',
    email: 'client@demo.astralcore.com',
    password: 'Demo123!Client',
    name: 'Emma Johnson',
    profile: {
      firstName: 'Emma',
      lastName: 'Johnson',
      dateOfBirth: new Date('1992-11-08'),
      phoneNumber: '+1-555-CLIENT-1',
      address: '789 Hope Lane, Support City, SC 11111',
      city: 'Support City',
      state: 'SC',
      zipCode: '11111',
      country: 'USA',
      emergencyContact: {
        name: 'Sarah Johnson (Sister)',
        phone: '+1-555-EMRGNCY-1',
        relationship: 'Sister'
      }
    }
  },
  {
    role: 'CRISIS_RESPONDER',
    email: 'crisis@demo.astralcore.com',
    password: 'Demo123!Crisis',
    name: 'Alex Crisis-Response',
    profile: {
      firstName: 'Alex',
      lastName: 'Crisis-Response',
      dateOfBirth: new Date('1988-09-14'),
      phoneNumber: '+1-555-CRISIS-1',
      address: '24/7 Emergency Response Center, Crisis City, CR 99999',
      city: 'Crisis City',
      state: 'CR',
      zipCode: '99999',
      country: 'USA'
    }
  },
  {
    role: 'SUPERVISOR',
    email: 'supervisor@demo.astralcore.com',
    password: 'Demo123!Supervisor',
    name: 'Dr. Rachel Supervisor',
    profile: {
      firstName: 'Rachel',
      lastName: 'Supervisor',
      dateOfBirth: new Date('1975-12-03'),
      phoneNumber: '+1-555-SUPER-01',
      address: '321 Supervision Boulevard, Management City, MC 33333',
      city: 'Management City',
      state: 'MC',
      zipCode: '33333',
      country: 'USA'
    }
  }
];

// Additional demo data
const DEMO_WELLNESS_DATA = {
  moodScore: 7,
  anxietyLevel: 4,
  stressLevel: 5,
  sleepHours: 7.5,
  sleepQuality: 6,
  exercise: true,
  exerciseMinutes: 30,
  meditation: true,
  meditationMinutes: 15,
  socialContact: true,
  medications: ['Sertraline 50mg'],
  symptoms: ['mild anxiety in mornings'],
  triggers: ['work meetings', 'social events'],
  copingStrategies: ['deep breathing', 'progressive muscle relaxation', 'journaling'],
  notes: 'Feeling generally positive today. Had a good therapy session this week.'
};

const DEMO_JOURNAL_ENTRIES = [
  {
    title: 'Reflection on Today',
    content: 'Today was a good day. I practiced the breathing techniques Dr. Thompson taught me, and it really helped with my morning anxiety. I\'m grateful for the progress I\'m making.',
    mood: 'positive',
    tags: ['gratitude', 'progress', 'anxiety-management'],
    attachments: [],
    isPrivate: false
  },
  {
    title: 'Weekly Check-in',
    content: 'This week has been challenging but I\'m learning to cope better. The mindfulness exercises are becoming more natural.',
    mood: 'neutral',
    tags: ['mindfulness', 'coping-skills', 'weekly-reflection'],
    attachments: [],
    isPrivate: false
  }
];

async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

async function createDemoAccount(accountData) {
  try {
    console.log(`Creating demo account for ${accountData.role}: ${accountData.email}`);
    
    // Hash password
    const hashedPassword = await hashPassword(accountData.password);
    
    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email: accountData.email,
        password: hashedPassword,
        name: accountData.name,
        role: accountData.role,
        status: 'ACTIVE',
        emailVerified: new Date(),
        profile: {
          create: accountData.profile
        }
      }
    });
    
    console.log(`✅ Created user: ${user.email} (${user.role})`);
    
    // Create therapist profile if needed
    if (accountData.therapistProfile) {
      await prisma.therapistProfile.create({
        data: {
          userId: user.id,
          ...accountData.therapistProfile
        }
      });
      console.log(`✅ Created therapist profile for ${user.email}`);
    }
    
    // Add demo data for clients
    if (accountData.role === 'CLIENT') {
      // Create wellness data
      await prisma.wellnessData.create({
        data: {
          userId: user.id,
          ...DEMO_WELLNESS_DATA
        }
      });
      
      // Create journal entries
      for (const entry of DEMO_JOURNAL_ENTRIES) {
        await prisma.journalEntry.create({
          data: {
            userId: user.id,
            ...entry
          }
        });
      }
      
      console.log(`✅ Created demo wellness data and journal entries for ${user.email}`);
    }
    
    return user;
    
  } catch (error) {
    console.error(`❌ Error creating account ${accountData.email}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Creating demo accounts for Astral Core v7...\n');
  
  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Connected to database\n');
    
    // Create all demo accounts
    const createdUsers = [];
    
    for (const accountData of DEMO_ACCOUNTS) {
      // Check if account already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: accountData.email }
      });
      
      if (existingUser) {
        console.log(`⚠️  Account ${accountData.email} already exists, skipping...`);
        createdUsers.push(existingUser);
        continue;
      }
      
      const user = await createDemoAccount(accountData);
      if (user) {
        createdUsers.push(user);
      }
    }
    
    // Create some sample appointments between therapist and client
    const therapist = createdUsers.find(u => u.role === 'THERAPIST');
    const client = createdUsers.find(u => u.role === 'CLIENT');
    
    if (therapist && client) {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7); // Next week
      
      await prisma.appointment.create({
        data: {
          userId: client.id,
          therapistId: therapist.id,
          scheduledAt: appointmentDate,
          duration: 50, // 50 minutes
          type: 'THERAPY_SESSION',
          status: 'SCHEDULED',
          location: 'Virtual Session',
          meetingUrl: 'https://meet.astralcore.com/demo-session',
          notes: 'Regular therapy session focused on anxiety management and coping strategies.'
        }
      });
      
      console.log(`✅ Created sample appointment between therapist and client`);
    }
    
    console.log('\n🎉 Demo account creation completed!\n');
    console.log('='.repeat(60));
    console.log('DEMO LOGIN CREDENTIALS:');
    console.log('='.repeat(60));
    
    for (const account of DEMO_ACCOUNTS) {
      console.log(`\n${account.role}:`);
      console.log(`  Email: ${account.email}`);
      console.log(`  Password: ${account.password}`);
      console.log(`  Name: ${account.name}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔐 SECURITY NOTE: These are demo accounts for development/testing only.');
    console.log('📧 All demo emails use the @demo.astralcore.com domain.');
    console.log('🚀 You can now log in with any of these accounts to test different user experiences.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error during demo account creation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createDemoAccount, DEMO_ACCOUNTS };