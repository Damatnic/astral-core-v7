#!/usr/bin/env node

/**
 * Reset and Create Demo Accounts Script for Astral Core v7
 * This script clears existing demo accounts and creates fresh ones with complete data
 */

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
const DEMO_WELLNESS_DATA = [
  {
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
  },
  {
    moodScore: 8,
    anxietyLevel: 3,
    stressLevel: 4,
    sleepHours: 8,
    sleepQuality: 7,
    exercise: true,
    exerciseMinutes: 45,
    meditation: true,
    meditationMinutes: 20,
    socialContact: true,
    medications: ['Sertraline 50mg'],
    symptoms: [],
    triggers: ['deadlines'],
    copingStrategies: ['yoga', 'music therapy', 'nature walks'],
    notes: 'Great day! Anxiety management techniques are really working.'
  },
  {
    moodScore: 6,
    anxietyLevel: 5,
    stressLevel: 6,
    sleepHours: 6,
    sleepQuality: 5,
    exercise: false,
    exerciseMinutes: 0,
    meditation: true,
    meditationMinutes: 10,
    socialContact: false,
    medications: ['Sertraline 50mg'],
    symptoms: ['tension headache', 'fatigue'],
    triggers: ['conflict at work', 'poor sleep'],
    copingStrategies: ['breathing exercises', 'warm bath'],
    notes: 'Challenging day. Need to focus on self-care.'
  }
];

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
  },
  {
    title: 'Breakthrough Moment',
    content: 'Had a major breakthrough today! I was able to handle a stressful situation at work without panicking. The CBT techniques are really making a difference.',
    mood: 'positive',
    tags: ['breakthrough', 'CBT', 'work-stress', 'success'],
    attachments: [],
    isPrivate: false
  },
  {
    title: 'Difficult Day',
    content: 'Today was tough. Anxiety was high and I struggled to focus. But I\'m proud that I reached out for support and used my coping strategies.',
    mood: 'negative',
    tags: ['anxiety', 'struggle', 'support', 'resilience'],
    attachments: [],
    isPrivate: true
  },
  {
    title: 'Gratitude Practice',
    content: 'Three things I\'m grateful for today: 1) My supportive therapist, 2) The progress I\'ve made in managing anxiety, 3) My sister who is always there for me.',
    mood: 'positive',
    tags: ['gratitude', 'support-system', 'family'],
    attachments: [],
    isPrivate: false
  }
];

async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

async function clearDemoAccounts() {
  console.log('🧹 Clearing existing demo accounts...');
  
  const demoEmails = DEMO_ACCOUNTS.map(acc => acc.email);
  
  // First get all demo user IDs
  const demoUsers = await prisma.user.findMany({
    where: {
      email: {
        in: demoEmails
      }
    },
    select: {
      id: true,
      email: true
    }
  });
  
  const demoUserIds = demoUsers.map(u => u.id);
  
  if (demoUserIds.length > 0) {
    // Delete appointments where demo users are therapists
    await prisma.appointment.deleteMany({
      where: {
        therapistId: {
          in: demoUserIds
        }
      }
    });
    
    // Delete appointments where demo users are clients
    await prisma.appointment.deleteMany({
      where: {
        userId: {
          in: demoUserIds
        }
      }
    });
    
    // Delete crisis interventions
    await prisma.crisisIntervention.deleteMany({
      where: {
        userId: {
          in: demoUserIds
        }
      }
    });
    
    // Now delete users (cascade will handle other related records)
    const result = await prisma.user.deleteMany({
      where: {
        id: {
          in: demoUserIds
        }
      }
    });
    
    console.log(`✅ Cleared ${result.count} existing demo accounts and related data\n`);
  } else {
    console.log(`✅ No existing demo accounts to clear\n`);
  }
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
      // Create multiple wellness data entries
      console.log(`  Adding wellness data...`);
      for (const wellnessData of DEMO_WELLNESS_DATA) {
        const date = new Date();
        date.setDate(date.getDate() - DEMO_WELLNESS_DATA.indexOf(wellnessData) * 2); // Space out by 2 days
        
        await prisma.wellnessData.create({
          data: {
            userId: user.id,
            date: date,
            ...wellnessData
          }
        });
      }
      console.log(`  ✅ Created ${DEMO_WELLNESS_DATA.length} wellness data entries`);
      
      // Create journal entries
      console.log(`  Adding journal entries...`);
      for (const entry of DEMO_JOURNAL_ENTRIES) {
        const date = new Date();
        date.setDate(date.getDate() - DEMO_JOURNAL_ENTRIES.indexOf(entry) * 3); // Space out by 3 days
        
        await prisma.journalEntry.create({
          data: {
            userId: user.id,
            createdAt: date,
            ...entry
          }
        });
      }
      console.log(`  ✅ Created ${DEMO_JOURNAL_ENTRIES.length} journal entries`);
    }
    
    return user;
    
  } catch (error) {
    console.error(`❌ Error creating account ${accountData.email}:`, error.message);
    return null;
  }
}

async function createAppointments(users) {
  console.log('\n📅 Creating sample appointments...');
  
  const therapist = users.find(u => u.role === 'THERAPIST');
  const client = users.find(u => u.role === 'CLIENT');
  
  if (therapist && client) {
    // Create multiple appointments
    const appointments = [
      {
        daysFromNow: 7,
        type: 'THERAPY_SESSION',
        notes: 'Regular therapy session focused on anxiety management and coping strategies.'
      },
      {
        daysFromNow: 14,
        type: 'THERAPY_SESSION',
        notes: 'Follow-up session to review progress and adjust treatment plan.'
      },
      {
        daysFromNow: -7,
        type: 'THERAPY_SESSION',
        status: 'COMPLETED',
        notes: 'Discussed breakthrough moments and challenges. Client showing good progress.'
      },
      {
        daysFromNow: -14,
        type: 'INITIAL_CONSULTATION',
        status: 'COMPLETED',
        notes: 'Initial assessment completed. Established treatment goals and therapeutic approach.'
      }
    ];
    
    for (const apt of appointments) {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + apt.daysFromNow);
      
      await prisma.appointment.create({
        data: {
          userId: client.id,
          therapistId: therapist.id,
          scheduledAt: appointmentDate,
          duration: apt.type === 'INITIAL_CONSULTATION' ? 90 : 50,
          type: apt.type,
          status: apt.status || 'SCHEDULED',
          location: 'Virtual Session',
          meetingUrl: 'https://meet.astralcore.com/demo-session',
          notes: apt.notes
        }
      });
    }
    
    console.log(`✅ Created ${appointments.length} appointments between therapist and client`);
    
    // Create a crisis intervention record
    const crisisResponder = users.find(u => u.role === 'CRISIS_RESPONDER');
    if (crisisResponder) {
      const crisisDate = new Date();
      crisisDate.setDate(crisisDate.getDate() - 30); // 30 days ago
      
      await prisma.crisisIntervention.create({
        data: {
          userId: client.id,
          startTime: crisisDate,
          endTime: new Date(crisisDate.getTime() + (2 * 60 * 60 * 1000)), // 2 hours later
          severity: 'MODERATE',
          triggerEvent: 'Work-related stress leading to panic attack',
          symptoms: ['Rapid heartbeat', 'Shortness of breath', 'Sweating', 'Trembling', 'Fear of losing control'],
          interventionType: 'CALL',
          status: 'RESOLVED',
          outcome: 'Client successfully calmed using grounding techniques. Scheduled immediate follow-up with therapist. Provided crisis resources.',
          followUpRequired: true,
          followUpDate: new Date(crisisDate.getTime() + (24 * 60 * 60 * 1000)), // Next day
          responderNotes: 'Client contacted crisis line due to panic attack. Responded well to breathing exercises and grounding techniques. Safety plan reviewed and updated.',
          resourcesProvided: ['Crisis hotline numbers', 'Breathing exercise guide', 'Local emergency mental health services', 'Therapist emergency contact']
        }
      });
      
      console.log(`✅ Created crisis intervention record`);
    }
  }
}

async function main() {
  console.log('🚀 Reset and Create Demo Accounts for Astral Core v7\n');
  console.log('='.repeat(60));
  
  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Connected to database\n');
    
    // Clear existing demo accounts
    await clearDemoAccounts();
    
    // Create all demo accounts
    const createdUsers = [];
    
    for (const accountData of DEMO_ACCOUNTS) {
      const user = await createDemoAccount(accountData);
      if (user) {
        createdUsers.push(user);
      }
      console.log(); // Add spacing between accounts
    }
    
    // Create appointments and additional data
    await createAppointments(createdUsers);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Demo account creation completed successfully!');
    console.log('='.repeat(60));
    
    console.log('\nDEMO LOGIN CREDENTIALS:');
    console.log('='.repeat(60));
    
    for (const account of DEMO_ACCOUNTS) {
      console.log(`\n${account.role}:`);
      console.log(`  Email: ${account.email}`);
      console.log(`  Password: ${account.password}`);
      console.log(`  Name: ${account.name}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEMO DATA CREATED:');
    console.log('='.repeat(60));
    console.log('✅ 5 User accounts with complete profiles');
    console.log('✅ 1 Therapist profile with license and certifications');
    console.log('✅ 3 Wellness tracking entries for client');
    console.log('✅ 5 Journal entries for client');
    console.log('✅ 4 Appointments (2 completed, 2 scheduled)');
    console.log('✅ 1 Crisis intervention record');
    console.log('='.repeat(60));
    
    console.log('\n🔐 SECURITY NOTE: These are demo accounts for development/testing only.');
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