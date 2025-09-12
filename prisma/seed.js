/**
 * Astral Core v7 - Database Seed Script
 * =====================================
 * 
 * This script populates the database with demo data for development and testing.
 * It includes sample users, therapists, clients, and other essential data.
 * 
 * Usage:
 *   npx prisma db seed
 *   npm run db:seed
 * 
 * @version 7.0.0
 * @author Database Migration Agent
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Create admin user
    console.log('Creating admin user...');
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@astral-core.app' },
      update: {},
      create: {
        email: 'admin@astral-core.app',
        name: 'System Administrator',
        role: 'ADMIN',
        status: 'ACTIVE',
        password: await bcrypt.hash('admin123!', 12),
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'System',
            lastName: 'Administrator',
            dateOfBirth: new Date('1985-01-15'),
            phoneNumber: '+1-555-0000',
            address: '123 Admin Street',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'United States',
            preferences: {
              theme: 'system',
              notifications: true,
              language: 'en'
            }
          }
        },
        notificationPrefs: {
          create: {
            email: true,
            push: true,
            sms: false,
            appointments: true,
            messages: true,
            wellness: true,
            crisis: true
          }
        }
      },
      include: {
        profile: true,
        notificationPrefs: true
      }
    });
    
    console.log(`✓ Admin user created: ${adminUser.email}`);
    
    // Create sample therapists
    console.log('Creating sample therapists...');
    
    const therapist1 = await prisma.user.upsert({
      where: { email: 'dr.sarah.johnson@astral-core.app' },
      update: {},
      create: {
        email: 'dr.sarah.johnson@astral-core.app',
        name: 'Dr. Sarah Johnson',
        role: 'THERAPIST',
        status: 'ACTIVE',
        password: await bcrypt.hash('therapist123!', 12),
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            dateOfBirth: new Date('1985-03-15'),
            phoneNumber: '+1-555-0001',
            address: '456 Therapy Lane',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94103',
            country: 'United States'
          }
        },
        therapistProfile: {
          create: {
            licenseNumber: 'LPC-12345',
            licenseState: 'CA',
            licenseExpiry: new Date('2025-12-31'),
            specializations: ['Anxiety', 'Depression', 'PTSD', 'Cognitive Behavioral Therapy'],
            education: [
              {
                degree: 'Ph.D. in Clinical Psychology',
                institution: 'University of California, San Francisco',
                year: 2010,
                field: 'Clinical Psychology'
              },
              {
                degree: 'M.A. in Psychology',
                institution: 'Stanford University',
                year: 2007,
                field: 'Psychology'
              }
            ],
            certifications: [
              {
                name: 'Cognitive Behavioral Therapy Certification',
                issuer: 'International Association for Cognitive Psychotherapy',
                year: 2011,
                expires: '2026-01-01'
              },
              {
                name: 'Trauma-Focused CBT',
                issuer: 'National Child Traumatic Stress Network',
                year: 2013,
                expires: '2025-06-01'
              }
            ],
            yearsOfExperience: 15,
            bio: 'Dr. Sarah Johnson is a licensed clinical psychologist with over 15 years of experience treating anxiety, depression, and trauma-related disorders. She specializes in Cognitive Behavioral Therapy and has extensive training in trauma-focused interventions.',
            acceptingClients: true,
            maxClients: 50,
            currentClients: 23,
            availableHours: {
              monday: { start: '09:00', end: '17:00' },
              tuesday: { start: '09:00', end: '17:00' },
              wednesday: { start: '09:00', end: '17:00' },
              thursday: { start: '09:00', end: '17:00' },
              friday: { start: '09:00', end: '15:00' },
              saturday: { start: '10:00', end: '14:00' },
              sunday: { closed: true }
            },
            hourlyRate: 150.0,
            insuranceAccepted: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealthcare', 'Kaiser Permanente']
          }
        },
        notificationPrefs: {
          create: {
            email: true,
            push: true,
            sms: true,
            appointments: true,
            messages: true,
            wellness: false,
            crisis: true
          }
        }
      },
      include: {
        profile: true,
        therapistProfile: true
      }
    });
    
    const therapist2 = await prisma.user.upsert({
      where: { email: 'dr.michael.chen@astral-core.app' },
      update: {},
      create: {
        email: 'dr.michael.chen@astral-core.app',
        name: 'Dr. Michael Chen',
        role: 'THERAPIST',
        status: 'ACTIVE',
        password: await bcrypt.hash('therapist123!', 12),
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Michael',
            lastName: 'Chen',
            dateOfBirth: new Date('1980-07-22'),
            phoneNumber: '+1-555-0002',
            address: '789 Counseling Ave',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94104',
            country: 'United States'
          }
        },
        therapistProfile: {
          create: {
            licenseNumber: 'LMFT-67890',
            licenseState: 'CA',
            licenseExpiry: new Date('2026-06-30'),
            specializations: ['Family Therapy', 'Couples Counseling', 'Addiction Recovery', 'Mindfulness-Based Therapy'],
            education: [
              {
                degree: 'Ph.D. in Marriage and Family Therapy',
                institution: 'University of Southern California',
                year: 2008,
                field: 'Marriage and Family Therapy'
              }
            ],
            certifications: [
              {
                name: 'Gottman Method Couples Therapy',
                issuer: 'Gottman Institute',
                year: 2012,
                expires: '2025-12-01'
              },
              {
                name: 'Mindfulness-Based Stress Reduction',
                issuer: 'Center for Mindfulness',
                year: 2015,
                expires: 'N/A'
              }
            ],
            yearsOfExperience: 18,
            bio: 'Dr. Michael Chen is a licensed marriage and family therapist with expertise in couples counseling, family dynamics, and addiction recovery. He integrates mindfulness-based approaches with traditional therapeutic methods.',
            acceptingClients: true,
            maxClients: 45,
            currentClients: 18,
            availableHours: {
              monday: { start: '10:00', end: '18:00' },
              tuesday: { start: '10:00', end: '18:00' },
              wednesday: { start: '10:00', end: '18:00' },
              thursday: { start: '10:00', end: '18:00' },
              friday: { start: '10:00', end: '16:00' },
              saturday: { closed: true },
              sunday: { closed: true }
            },
            hourlyRate: 175.0,
            insuranceAccepted: ['Blue Cross Blue Shield', 'Anthem', 'Cigna', 'Humana']
          }
        },
        notificationPrefs: {
          create: {
            email: true,
            push: false,
            sms: false,
            appointments: true,
            messages: true,
            wellness: false,
            crisis: true
          }
        }
      }
    });
    
    console.log(`✓ Therapist created: ${therapist1.email}`);
    console.log(`✓ Therapist created: ${therapist2.email}`);
    
    // Create sample clients
    console.log('Creating sample clients...');
    
    const client1 = await prisma.user.upsert({
      where: { email: 'jane.doe@example.com' },
      update: {},
      create: {
        email: 'jane.doe@example.com',
        name: 'Jane Doe',
        role: 'CLIENT',
        status: 'ACTIVE',
        password: await bcrypt.hash('client123!', 12),
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Jane',
            lastName: 'Doe',
            dateOfBirth: new Date('1995-09-12'),
            phoneNumber: '+1-555-0003',
            address: '321 Client Street',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94105',
            country: 'United States',
            emergencyContact: {
              name: 'John Doe',
              relationship: 'Spouse',
              phone: '+1-555-0004',
              email: 'john.doe@example.com'
            },
            preferences: {
              theme: 'light',
              notifications: true,
              language: 'en',
              timezone: 'America/Los_Angeles'
            }
          }
        },
        clientProfiles: {
          create: {
            therapistId: therapist1.therapistProfile.id,
            intakeDate: new Date('2024-01-15'),
            status: 'ACTIVE',
            primaryConcerns: ['Anxiety', 'Work-related stress', 'Sleep issues'],
            goals: [
              'Reduce daily anxiety levels',
              'Improve sleep quality',
              'Develop better coping strategies for work stress',
              'Build self-confidence'
            ],
            riskLevel: 'LOW',
            consentForms: {
              hipaaConsent: { signed: true, date: '2024-01-15', version: '1.0' },
              treatmentConsent: { signed: true, date: '2024-01-15', version: '1.0' },
              emergencyContact: { signed: true, date: '2024-01-15', version: '1.0' }
            },
            insuranceInfo: {
              provider: 'Blue Cross Blue Shield',
              planType: 'PPO',
              memberID: 'BC123456789',
              groupNumber: 'GRP001',
              copay: 25.00,
              deductible: 500.00
            }
          }
        },
        notificationPrefs: {
          create: {
            email: true,
            push: true,
            sms: true,
            appointments: true,
            messages: true,
            wellness: true,
            crisis: true
          }
        }
      }
    });
    
    const client2 = await prisma.user.upsert({
      where: { email: 'robert.smith@example.com' },
      update: {},
      create: {
        email: 'robert.smith@example.com',
        name: 'Robert Smith',
        role: 'CLIENT',
        status: 'ACTIVE',
        password: await bcrypt.hash('client123!', 12),
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Robert',
            lastName: 'Smith',
            dateOfBirth: new Date('1988-11-30'),
            phoneNumber: '+1-555-0005',
            address: '654 Patient Ave',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94106',
            country: 'United States',
            emergencyContact: {
              name: 'Lisa Smith',
              relationship: 'Sister',
              phone: '+1-555-0006',
              email: 'lisa.smith@example.com'
            }
          }
        },
        clientProfiles: {
          create: {
            therapistId: therapist2.therapistProfile.id,
            intakeDate: new Date('2024-02-01'),
            status: 'ACTIVE',
            primaryConcerns: ['Depression', 'Relationship issues', 'Family dynamics'],
            goals: [
              'Improve mood and motivation',
              'Better communication skills',
              'Resolve family conflicts',
              'Develop emotional regulation skills'
            ],
            riskLevel: 'MODERATE',
            consentForms: {
              hipaaConsent: { signed: true, date: '2024-02-01', version: '1.0' },
              treatmentConsent: { signed: true, date: '2024-02-01', version: '1.0' },
              emergencyContact: { signed: true, date: '2024-02-01', version: '1.0' }
            },
            insuranceInfo: {
              provider: 'Cigna',
              planType: 'HMO',
              memberID: 'CG987654321',
              groupNumber: 'GRP002',
              copay: 30.00,
              deductible: 1000.00
            }
          }
        }
      }
    });
    
    console.log(`✓ Client created: ${client1.email}`);
    console.log(`✓ Client created: ${client2.email}`);
    
    // Create crisis responder
    console.log('Creating crisis responder...');
    
    const crisisResponder = await prisma.user.upsert({
      where: { email: 'crisis.responder@astral-core.app' },
      update: {},
      create: {
        email: 'crisis.responder@astral-core.app',
        name: 'Crisis Response Team',
        role: 'CRISIS_RESPONDER',
        status: 'ACTIVE',
        password: await bcrypt.hash('crisis123!', 12),
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Crisis',
            lastName: 'Responder',
            dateOfBirth: new Date('1982-05-20'),
            phoneNumber: '+1-555-CRISIS',
            address: '911 Emergency Blvd',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94107',
            country: 'United States'
          }
        },
        notificationPrefs: {
          create: {
            email: true,
            push: true,
            sms: true,
            appointments: false,
            messages: true,
            wellness: false,
            crisis: true
          }
        }
      }
    });
    
    console.log(`✓ Crisis responder created: ${crisisResponder.email}`);
    
    // Create sample appointments
    console.log('Creating sample appointments...');
    
    const appointment1 = await prisma.appointment.create({
      data: {
        userId: client1.id,
        therapistId: therapist1.id,
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        duration: 60,
        type: 'THERAPY_SESSION',
        status: 'SCHEDULED',
        location: 'Office 205, 456 Therapy Lane',
        notes: 'Follow-up session to discuss anxiety management techniques'
      }
    });
    
    const appointment2 = await prisma.appointment.create({
      data: {
        userId: client2.id,
        therapistId: therapist2.id,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        duration: 60,
        type: 'THERAPY_SESSION',
        status: 'CONFIRMED',
        meetingUrl: 'https://meet.astral-core.app/room/abc123',
        notes: 'Family therapy session - discuss communication strategies'
      }
    });
    
    console.log(`✓ Created ${2} sample appointments`);
    
    // Create sample wellness data
    console.log('Creating sample wellness data...');
    
    const wellnessEntries = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      wellnessEntries.push({
        userId: client1.id,
        date: date,
        moodScore: Math.floor(Math.random() * 10) + 1,
        anxietyLevel: Math.floor(Math.random() * 10) + 1,
        stressLevel: Math.floor(Math.random() * 10) + 1,
        sleepHours: Math.random() * 4 + 6, // 6-10 hours
        sleepQuality: Math.floor(Math.random() * 5) + 1,
        exercise: Math.random() > 0.6,
        exerciseMinutes: Math.random() > 0.6 ? Math.floor(Math.random() * 60) + 30 : null,
        meditation: Math.random() > 0.7,
        meditationMinutes: Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 10 : null,
        socialContact: Math.random() > 0.5,
        medications: ['Sertraline 50mg'],
        symptoms: Math.random() > 0.8 ? ['Nervousness', 'Racing thoughts'] : [],
        triggers: Math.random() > 0.8 ? ['Work deadlines', 'Social situations'] : [],
        copingStrategies: ['Deep breathing', 'Progressive muscle relaxation'],
        notes: i === 0 ? 'Feeling much better today after implementing breathing exercises' : null
      });
    }
    
    await prisma.wellnessData.createMany({
      data: wellnessEntries
    });
    
    console.log(`✓ Created ${wellnessEntries.length} wellness data entries`);
    
    // Create sample journal entries
    console.log('Creating sample journal entries...');
    
    await prisma.journalEntry.createMany({
      data: [
        {
          userId: client1.id,
          title: 'First Week of Therapy',
          content: 'Today was my first therapy session with Dr. Johnson. I was nervous at first, but she made me feel comfortable. We talked about my anxiety and some coping strategies. I\'m looking forward to working on myself.',
          mood: 'hopeful',
          tags: ['therapy', 'anxiety', 'first-session'],
          isPrivate: true,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          userId: client1.id,
          title: 'Breathing Exercises Work',
          content: 'I tried the breathing exercises Dr. Johnson taught me when I felt anxious about the presentation at work. It actually helped! I was able to calm down and deliver the presentation successfully.',
          mood: 'accomplished',
          tags: ['breathing', 'work', 'success', 'coping'],
          isPrivate: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          userId: client2.id,
          title: 'Family Dinner',
          content: 'Had dinner with my family tonight. Used some of the communication techniques Dr. Chen suggested. The conversation went much smoother than usual. Maybe there\'s hope for us after all.',
          mood: 'optimistic',
          tags: ['family', 'communication', 'progress'],
          isPrivate: true,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ]
    });
    
    console.log(`✓ Created 3 sample journal entries`);
    
    // Create sample notifications
    console.log('Creating sample notifications...');
    
    await prisma.notification.createMany({
      data: [
        {
          userId: client1.id,
          title: 'Appointment Reminder',
          message: 'You have an appointment with Dr. Sarah Johnson tomorrow at 2:00 PM.',
          type: 'APPOINTMENT',
          priority: 'NORMAL',
          actionUrl: '/appointments'
        },
        {
          userId: client1.id,
          title: 'Wellness Check-in',
          message: 'Don\'t forget to log your daily wellness data!',
          type: 'WELLNESS',
          priority: 'LOW',
          actionUrl: '/wellness'
        },
        {
          userId: client2.id,
          title: 'New Message',
          message: 'Dr. Michael Chen sent you a message.',
          type: 'MESSAGE',
          priority: 'NORMAL',
          actionUrl: '/messages'
        }
      ]
    });
    
    console.log(`✓ Created 3 sample notifications`);
    
    // Create sample groups
    console.log('Creating sample support groups...');
    
    const anxietyGroup = await prisma.group.create({
      data: {
        name: 'Anxiety Support Group',
        description: 'A supportive community for people dealing with anxiety disorders. Share experiences, coping strategies, and encouragement.',
        type: 'support',
        isPrivate: false,
        maxMembers: 15,
        createdBy: therapist1.id,
        members: {
          create: [
            {
              userId: client1.id,
              role: 'member',
              status: 'ACTIVE'
            },
            {
              userId: therapist1.id,
              role: 'moderator',
              status: 'ACTIVE'
            }
          ]
        }
      }
    });
    
    const depressionGroup = await prisma.group.create({
      data: {
        name: 'Depression Recovery Circle',
        description: 'A safe space for individuals working through depression. Focus on recovery, self-care, and building resilience.',
        type: 'support',
        isPrivate: true,
        maxMembers: 12,
        createdBy: therapist2.id,
        members: {
          create: [
            {
              userId: client2.id,
              role: 'member',
              status: 'ACTIVE'
            },
            {
              userId: therapist2.id,
              role: 'moderator',
              status: 'ACTIVE'
            }
          ]
        }
      }
    });
    
    console.log(`✓ Created 2 support groups`);
    
    // Create sample conversations
    console.log('Creating sample conversations...');
    
    const therapistClientConvo = await prisma.conversation.create({
      data: {
        type: 'THERAPY',
        title: 'Dr. Johnson & Jane Doe',
        lastMessage: 'Thank you for the session notes. See you next week!',
        lastActivity: new Date(),
        participants: {
          create: [
            {
              userId: therapist1.id,
              role: 'therapist'
            },
            {
              userId: client1.id,
              role: 'client'
            }
          ]
        },
        messages: {
          create: [
            {
              senderId: therapist1.id,
              content: 'Hi Jane, I wanted to follow up on our session today. How are you feeling about the breathing exercises we discussed?',
              type: 'text',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            },
            {
              senderId: client1.id,
              content: 'Hi Dr. Johnson! I tried them twice today and they really helped when I started feeling anxious about work. Thank you!',
              type: 'text',
              isRead: true,
              readAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
              createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
            },
            {
              senderId: therapist1.id,
              content: 'That\'s wonderful to hear! Keep practicing them. I\'ve uploaded some session notes to your portal. See you next week!',
              type: 'text',
              createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
            },
            {
              senderId: client1.id,
              content: 'Thank you for the session notes. See you next week!',
              type: 'text',
              createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
            }
          ]
        }
      }
    });
    
    console.log(`✓ Created sample conversation`);
    
    // Create sample audit logs
    console.log('Creating sample audit logs...');
    
    await prisma.auditLog.createMany({
      data: [
        {
          userId: adminUser.id,
          action: 'USER_LOGIN',
          entity: 'User',
          entityId: adminUser.id,
          details: {
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            method: 'password'
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          outcome: 'SUCCESS',
          createdAt: new Date(Date.now() - 60 * 60 * 1000)
        },
        {
          userId: client1.id,
          action: 'WELLNESS_DATA_CREATE',
          entity: 'WellnessData',
          details: {
            moodScore: 7,
            anxietyLevel: 3,
            date: new Date().toISOString()
          },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          outcome: 'SUCCESS',
          createdAt: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          userId: therapist1.id,
          action: 'APPOINTMENT_CREATE',
          entity: 'Appointment',
          details: {
            clientId: client1.id,
            scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'THERAPY_SESSION'
          },
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          outcome: 'SUCCESS',
          createdAt: new Date(Date.now() - 10 * 60 * 1000)
        }
      ]
    });
    
    console.log(`✓ Created sample audit logs`);
    
    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📊 Demo Data Summary:');
    console.log('====================');
    console.log(`✓ 1 Administrator: admin@astral-core.app`);
    console.log(`✓ 2 Therapists: dr.sarah.johnson@astral-core.app, dr.michael.chen@astral-core.app`);
    console.log(`✓ 2 Clients: jane.doe@example.com, robert.smith@example.com`);
    console.log(`✓ 1 Crisis Responder: crisis.responder@astral-core.app`);
    console.log(`✓ 2 Appointments scheduled`);
    console.log(`✓ 30 Wellness data entries`);
    console.log(`✓ 3 Journal entries`);
    console.log(`✓ 2 Support groups`);
    console.log(`✓ 1 Conversation with messages`);
    console.log(`✓ Sample notifications and audit logs`);
    console.log('');
    console.log('🔐 Demo Login Credentials:');
    console.log('==========================');
    console.log('Admin: admin@astral-core.app / admin123!');
    console.log('Therapist 1: dr.sarah.johnson@astral-core.app / therapist123!');
    console.log('Therapist 2: dr.michael.chen@astral-core.app / therapist123!');
    console.log('Client 1: jane.doe@example.com / client123!');
    console.log('Client 2: robert.smith@example.com / client123!');
    console.log('Crisis: crisis.responder@astral-core.app / crisis123!');
    console.log('');
    console.log('⚠️  Remember to change these passwords in production!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });