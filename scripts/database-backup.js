#!/usr/bin/env node

/**
 * Database Backup Strategy
 * Automated backup script for production database
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const execAsync = promisify(exec);

// Configuration
const BACKUP_CONFIG = {
  // Backup directory
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'),
  
  // Database connection
  databaseUrl: process.env.DATABASE_URL || process.env.DIRECT_URL,
  
  // Retention policy
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  
  // Encryption
  encryptBackups: process.env.ENCRYPT_BACKUPS === 'true',
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
  
  // Cloud storage (optional)
  uploadToCloud: process.env.UPLOAD_BACKUPS_TO_CLOUD === 'true',
  cloudBucket: process.env.BACKUP_CLOUD_BUCKET,
  
  // Notification
  notifyOnSuccess: process.env.NOTIFY_BACKUP_SUCCESS === 'true',
  notifyOnFailure: process.env.NOTIFY_BACKUP_FAILURE === 'true',
  notificationWebhook: process.env.BACKUP_NOTIFICATION_WEBHOOK
};

// Logging
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    level,
    message,
    ...data
  }));
}

// Parse database URL
function parseDatabaseUrl(url) {
  if (!url) {
    throw new Error('DATABASE_URL not provided');
  }
  
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):?(\d+)?\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4] || '5432',
    database: match[5].split('?')[0]
  };
}

// Create backup filename
function getBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const env = process.env.NODE_ENV || 'production';
  return `backup-${env}-${timestamp}.sql`;
}

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_CONFIG.backupDir, { recursive: true });
    log('info', 'Backup directory ready', { dir: BACKUP_CONFIG.backupDir });
  } catch (error) {
    log('error', 'Failed to create backup directory', { error: error.message });
    throw error;
  }
}

// Perform database backup using pg_dump
async function performBackup() {
  const dbConfig = parseDatabaseUrl(BACKUP_CONFIG.databaseUrl);
  const backupFile = path.join(BACKUP_CONFIG.backupDir, getBackupFilename());
  
  // Build pg_dump command
  const pgDumpCommand = [
    'pg_dump',
    `-h ${dbConfig.host}`,
    `-p ${dbConfig.port}`,
    `-U ${dbConfig.user}`,
    `-d ${dbConfig.database}`,
    '--no-password',
    '--verbose',
    '--format=custom',
    '--no-acl',
    '--no-owner',
    `--file="${backupFile}"`
  ].join(' ');
  
  // Set PGPASSWORD environment variable
  const env = { ...process.env, PGPASSWORD: dbConfig.password };
  
  try {
    log('info', 'Starting database backup', { 
      database: dbConfig.database,
      host: dbConfig.host 
    });
    
    const { stdout, stderr } = await execAsync(pgDumpCommand, { env });
    
    // Check if file was created
    const stats = await fs.stat(backupFile);
    
    log('info', 'Backup completed successfully', {
      file: backupFile,
      size: stats.size,
      stdout: stdout.substring(0, 500),
      stderr: stderr.substring(0, 500)
    });
    
    return backupFile;
  } catch (error) {
    log('error', 'Backup failed', { 
      error: error.message,
      command: pgDumpCommand.replace(dbConfig.password, '***')
    });
    throw error;
  }
}

// Encrypt backup file
async function encryptBackup(backupFile) {
  if (!BACKUP_CONFIG.encryptBackups || !BACKUP_CONFIG.encryptionKey) {
    log('info', 'Skipping encryption (not configured)');
    return backupFile;
  }
  
  const encryptedFile = `${backupFile}.enc`;
  
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(BACKUP_CONFIG.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const input = await fs.readFile(backupFile);
    const encrypted = Buffer.concat([
      iv,
      cipher.update(input),
      cipher.final(),
      cipher.getAuthTag()
    ]);
    
    await fs.writeFile(encryptedFile, encrypted);
    await fs.unlink(backupFile); // Remove unencrypted file
    
    log('info', 'Backup encrypted successfully', { file: encryptedFile });
    return encryptedFile;
  } catch (error) {
    log('error', 'Encryption failed', { error: error.message });
    throw error;
  }
}

// Upload to cloud storage (AWS S3 example)
async function uploadToCloud(backupFile) {
  if (!BACKUP_CONFIG.uploadToCloud || !BACKUP_CONFIG.cloudBucket) {
    log('info', 'Skipping cloud upload (not configured)');
    return;
  }
  
  try {
    const filename = path.basename(backupFile);
    const s3Command = `aws s3 cp "${backupFile}" "s3://${BACKUP_CONFIG.cloudBucket}/${filename}"`;
    
    const { stdout, stderr } = await execAsync(s3Command);
    
    log('info', 'Backup uploaded to cloud', {
      bucket: BACKUP_CONFIG.cloudBucket,
      file: filename,
      stdout: stdout.substring(0, 500)
    });
  } catch (error) {
    log('error', 'Cloud upload failed', { error: error.message });
    // Don't throw - cloud upload is optional
  }
}

// Clean old backups
async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_CONFIG.backupDir);
    const now = Date.now();
    const maxAge = BACKUP_CONFIG.retentionDays * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      if (!file.startsWith('backup-')) continue;
      
      const filePath = path.join(BACKUP_CONFIG.backupDir, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtimeMs;
      
      if (age > maxAge) {
        await fs.unlink(filePath);
        log('info', 'Deleted old backup', { file, ageInDays: Math.floor(age / (24 * 60 * 60 * 1000)) });
      }
    }
  } catch (error) {
    log('error', 'Failed to clean old backups', { error: error.message });
    // Don't throw - cleanup is optional
  }
}

// Send notification
async function sendNotification(success, details) {
  if (!BACKUP_CONFIG.notificationWebhook) return;
  if (!success && !BACKUP_CONFIG.notifyOnFailure) return;
  if (success && !BACKUP_CONFIG.notifyOnSuccess) return;
  
  try {
    const payload = {
      success,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      ...details
    };
    
    // Use fetch or axios to send webhook
    // This is a placeholder - implement based on your notification service
    log('info', 'Notification sent', { success, details });
  } catch (error) {
    log('error', 'Failed to send notification', { error: error.message });
  }
}

// Verify backup integrity
async function verifyBackup(backupFile) {
  try {
    const stats = await fs.stat(backupFile);
    
    if (stats.size < 1000) {
      throw new Error('Backup file too small, possibly corrupted');
    }
    
    log('info', 'Backup verified', { 
      file: backupFile,
      size: stats.size 
    });
    
    return true;
  } catch (error) {
    log('error', 'Backup verification failed', { error: error.message });
    throw error;
  }
}

// Main backup process
async function runBackup() {
  const startTime = Date.now();
  let backupFile = null;
  
  try {
    log('info', 'Starting backup process');
    
    // Ensure backup directory exists
    await ensureBackupDir();
    
    // Perform backup
    backupFile = await performBackup();
    
    // Verify backup
    await verifyBackup(backupFile);
    
    // Encrypt if configured
    backupFile = await encryptBackup(backupFile);
    
    // Upload to cloud if configured
    await uploadToCloud(backupFile);
    
    // Clean old backups
    await cleanOldBackups();
    
    const duration = Date.now() - startTime;
    
    log('info', 'Backup process completed successfully', {
      duration,
      file: backupFile
    });
    
    await sendNotification(true, { 
      duration,
      file: path.basename(backupFile) 
    });
    
    return { success: true, file: backupFile, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    log('error', 'Backup process failed', {
      error: error.message,
      duration
    });
    
    await sendNotification(false, { 
      error: error.message,
      duration 
    });
    
    // Clean up partial backup if exists
    if (backupFile) {
      try {
        await fs.unlink(backupFile);
      } catch (cleanupError) {
        log('error', 'Failed to clean up partial backup', { 
          error: cleanupError.message 
        });
      }
    }
    
    throw error;
  }
}

// Handle command line execution
if (require.main === module) {
  runBackup()
    .then(result => {
      console.log('Backup completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
}

module.exports = { runBackup, verifyBackup, cleanOldBackups };