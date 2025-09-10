import { createReadStream, promises as fs } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { logError, logWarning } from '@/lib/logger';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { phiService } from '@/lib/security/phi-service';
import { audit } from '@/lib/security/audit';
import { notificationService } from './notification-service';
import { FileCategory } from '@prisma/client';

interface UploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  uploadDir: string;
  encryptFiles: boolean;
}

interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  userId: string;
  category: FileCategory;
  description?: string;
  isPrivate: boolean;
}

interface ProcessedFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  isEncrypted: boolean;
  thumbnailUrl?: string;
}

export class FileUploadService {
  private readonly configs: Record<FileCategory, UploadConfig> = {
    CONSENT_FORM: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      uploadDir: 'uploads/consent-forms',
      encryptFiles: true
    },
    INSURANCE: {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      uploadDir: 'uploads/insurance',
      encryptFiles: true
    },
    MEDICAL_RECORD: {
      maxFileSize: 20 * 1024 * 1024, // 20MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
      uploadDir: 'uploads/medical-records',
      encryptFiles: true
    },
    SESSION_NOTE: {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword'],
      uploadDir: 'uploads/session-notes',
      encryptFiles: true
    },
    ASSESSMENT: {
      maxFileSize: 15 * 1024 * 1024, // 15MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      uploadDir: 'uploads/assessments',
      encryptFiles: true
    },
    REPORT: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      uploadDir: 'uploads/reports',
      encryptFiles: true
    },
    OTHER: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
      uploadDir: 'uploads/other',
      encryptFiles: false
    }
  };

  private readonly baseUploadDir = process.env['UPLOAD_BASE_DIR'] || './uploads';

  // Upload and process file
  async uploadFile(buffer: Buffer, metadata: FileMetadata): Promise<ProcessedFile> {
    try {
      const config = this.configs[metadata.category];

      // Validate file
      await this.validateFile(buffer, metadata, config);

      // Generate unique filename
      const fileId = crypto.randomUUID();
      const extension = this.getFileExtension(metadata.originalName);
      const filename = `${fileId}${extension}`;
      const fullPath = join(this.baseUploadDir, config.uploadDir, filename);

      // Ensure directory exists
      await fs.mkdir(join(this.baseUploadDir, config.uploadDir), { recursive: true });

      // Process and save file
      let processedBuffer = buffer;
      let isEncrypted = false;

      // Encrypt if required
      if (config.encryptFiles) {
        processedBuffer = await this.encryptFile(buffer);
        isEncrypted = true;
      }

      // Optimize images
      if (this.isImage(metadata.mimeType)) {
        processedBuffer = await this.optimizeImage(processedBuffer, config.encryptFiles);
      }

      // Save file
      await fs.writeFile(fullPath, processedBuffer);

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (this.isImage(metadata.mimeType)) {
        thumbnailUrl = await this.generateThumbnail(buffer, fileId, config);
      }

      // Save to database
      const fileRecord = await prisma.file.create({
        data: {
          id: fileId,
          userId: metadata.userId,
          filename,
          originalName: metadata.originalName,
          mimeType: metadata.mimeType,
          size: buffer.length,
          url: `/api/files/${fileId}`,
          category: metadata.category,
          isEncrypted,
          metadata: {
            description: metadata.description,
            isPrivate: metadata.isPrivate,
            thumbnailUrl,
            uploadedAt: new Date(),
            checksum: this.calculateChecksum(buffer)
          }
        }
      });

      // Audit log
      await audit.logSuccess(
        'FILE_UPLOADED',
        'File',
        fileId,
        {
          category: metadata.category,
          size: buffer.length,
          mimeType: metadata.mimeType,
          isEncrypted
        },
        metadata.userId
      );

      // Send notification for important documents
      if (['CONSENT_FORM', 'MEDICAL_RECORD', 'ASSESSMENT'].includes(metadata.category)) {
        await notificationService.createNotification({
          userId: metadata.userId,
          title: 'Document Uploaded',
          message: `Your ${metadata.category.toLowerCase().replace('_', ' ')} has been uploaded successfully`,
          type: 'SYSTEM',
          actionUrl: `/files/${fileId}`
        });
      }

      return {
        id: fileId,
        filename,
        originalName: metadata.originalName,
        url: fileRecord.url,
        size: buffer.length,
        mimeType: metadata.mimeType,
        category: metadata.category,
        isEncrypted,
        thumbnailUrl
      };
    } catch (error) {
      logError('Error uploading file', error, 'file-upload-service');
      throw error;
    }
  }

  // Get file stream for download
  async getFileStream(fileId: string, userId: string) {
    try {
      // Get file record
      const fileRecord = await prisma.file.findUnique({
        where: { id: fileId },
        include: {
          user: true
        }
      });

      if (!fileRecord) {
        throw new Error('File not found');
      }

      // Check access permissions
      await this.checkFileAccess(fileRecord, userId);

      const config = this.configs[fileRecord.category];
      const fullPath = join(this.baseUploadDir, config.uploadDir, fileRecord.filename);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        throw new Error('File not found on disk');
      }

      let stream = createReadStream(fullPath);

      // Decrypt if needed
      if (fileRecord.isEncrypted) {
        const encryptedBuffer = await fs.readFile(fullPath);
        const decryptedBuffer = await this.decryptFile(encryptedBuffer);
        const { Readable } = await import('stream');
        stream = Readable.from(decryptedBuffer);
      }

      // Audit log
      await audit.logSuccess(
        'FILE_ACCESSED',
        'File',
        fileId,
        { category: fileRecord.category },
        userId
      );

      return {
        stream,
        filename: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size
      };
    } catch (error) {
      logError('Error getting file stream', error, 'file-upload-service');
      throw error;
    }
  }

  // Get user files
  async getUserFiles(
    userId: string,
    filters: {
      category?: FileCategory;
      isPrivate?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const where: Record<string, unknown> = {};

      // Check if user has admin access or is requesting their own files
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (user?.role !== 'ADMIN') {
        // Non-admin users can only see their own files or public files they have access to
        where.OR = [
          { userId },
          {
            AND: [
              { 'metadata.isPrivate': false }
              // Add additional access logic here for shared files
            ]
          }
        ];
      }

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.isPrivate !== undefined) {
        where['metadata.isPrivate'] = filters.isPrivate;
      }

      const [files, total] = await Promise.all([
        prisma.file.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { uploadedAt: 'desc' },
          take: filters.limit || 20,
          skip: filters.offset || 0
        }),
        prisma.file.count({ where })
      ]);

      return {
        files: files.map(file => ({
          ...file,
          metadata: file.metadata as Record<string, unknown>
        })),
        total,
        hasMore: (filters.offset || 0) + files.length < total
      };
    } catch (error) {
      logError('Error getting user files', error, 'file-upload-service');
      throw error;
    }
  }

  // Delete file
  async deleteFile(fileId: string, userId: string) {
    try {
      const fileRecord = await prisma.file.findUnique({
        where: { id: fileId }
      });

      if (!fileRecord) {
        throw new Error('File not found');
      }

      // Check permissions
      await this.checkFileAccess(fileRecord, userId);

      const config = this.configs[fileRecord.category];
      const fullPath = join(this.baseUploadDir, config.uploadDir, fileRecord.filename);

      // Delete physical file
      try {
        await fs.unlink(fullPath);
      } catch {
        logWarning(
          'Physical file not found, continuing with database deletion',
          'file-upload-service'
        );
      }

      // Delete thumbnail if exists
      const metadata = fileRecord.metadata as Record<string, unknown>;
      if (metadata?.thumbnailUrl) {
        const thumbnailPath = join(
          this.baseUploadDir,
          config.uploadDir,
          'thumbnails',
          `thumb_${fileRecord.filename}`
        );
        try {
          await fs.unlink(thumbnailPath);
        } catch {
          logWarning('Thumbnail file not found', 'file-upload-service');
        }
      }

      // Delete database record
      await prisma.file.delete({
        where: { id: fileId }
      });

      // Audit log
      await audit.logSuccess(
        'FILE_DELETED',
        'File',
        fileId,
        { category: fileRecord.category },
        userId
      );

      return { success: true };
    } catch (error) {
      logError('Error deleting file', error, 'file-upload-service');
      throw error;
    }
  }

  // Share file with another user
  async shareFile(
    fileId: string,
    fromUserId: string,
    toUserId: string,
    permissions: string[] = ['read']
  ) {
    try {
      const fileRecord = await prisma.file.findUnique({
        where: { id: fileId }
      });

      if (!fileRecord) {
        throw new Error('File not found');
      }

      // Check if user owns the file
      if (fileRecord.userId !== fromUserId) {
        throw new Error('Not authorized to share this file');
      }

      // Create file share record (would need to add this to schema)
      // For now, we'll just send a notification
      await notificationService.createNotification({
        userId: toUserId,
        title: 'File Shared',
        message: `A file has been shared with you: ${fileRecord.originalName}`,
        type: 'SYSTEM',
        actionUrl: `/files/${fileId}`,
        metadata: {
          fileId,
          fromUserId,
          permissions
        }
      });

      // Audit log
      await audit.logSuccess('FILE_SHARED', 'File', fileId, { toUserId, permissions }, fromUserId);

      return { success: true };
    } catch (error) {
      logError('Error sharing file', error, 'file-upload-service');
      throw error;
    }
  }

  // Scan files for viruses/malware (placeholder for integration)
  async scanFile(buffer: Buffer): Promise<boolean> {
    // In production, integrate with antivirus service like ClamAV
    // For now, just check for suspicious patterns
    const content = buffer.toString();

    const suspiciousPatterns = [/<script/i, /javascript:/i, /vbscript:/i, /onload=/i, /onerror=/i];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }

    return true;
  }

  // Helper methods
  private async validateFile(buffer: Buffer, metadata: FileMetadata, config: UploadConfig) {
    // Check file size
    if (buffer.length > config.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${config.maxFileSize / (1024 * 1024)}MB`
      );
    }

    // Check MIME type
    if (!config.allowedMimeTypes.includes(metadata.mimeType)) {
      throw new Error(`File type ${metadata.mimeType} is not allowed for this category`);
    }

    // Scan for malware
    const isClean = await this.scanFile(buffer);
    if (!isClean) {
      throw new Error('File failed security scan');
    }

    // Check file signature (magic numbers) to prevent MIME type spoofing
    const actualMimeType = this.detectMimeType(buffer);
    if (actualMimeType && actualMimeType !== metadata.mimeType) {
      throw new Error('File type mismatch detected');
    }
  }

  private detectMimeType(buffer: Buffer): string | null {
    // Check magic numbers for common file types
    const signatures = [
      { signature: [0xff, 0xd8, 0xff], mimeType: 'image/jpeg' },
      { signature: [0x89, 0x50, 0x4e, 0x47], mimeType: 'image/png' },
      { signature: [0x25, 0x50, 0x44, 0x46], mimeType: 'application/pdf' }
    ];

    for (const { signature, mimeType } of signatures) {
      if (buffer.subarray(0, signature.length).equals(Buffer.from(signature))) {
        return mimeType;
      }
    }

    return null;
  }

  private async encryptFile(buffer: Buffer): Promise<Buffer> {
    const encrypted = await phiService.encryptBinary(buffer);
    return Buffer.from(encrypted, 'base64');
  }

  private async decryptFile(encryptedBuffer: Buffer): Promise<Buffer> {
    const decrypted = await phiService.decryptBinary(encryptedBuffer.toString('base64'));
    return Buffer.from(decrypted);
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private async optimizeImage(buffer: Buffer, skipIfEncrypted: boolean = false): Promise<Buffer> {
    if (skipIfEncrypted) return buffer;

    try {
      return await sharp(buffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      logWarning('Image optimization failed, using original', 'file-upload-service', {
        error: error.message
      });
      return buffer;
    }
  }

  private async generateThumbnail(
    buffer: Buffer,
    fileId: string,
    config: UploadConfig
  ): Promise<string> {
    try {
      const thumbnailBuffer = await sharp(buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toBuffer();

      const thumbnailDir = join(this.baseUploadDir, config.uploadDir, 'thumbnails');
      await fs.mkdir(thumbnailDir, { recursive: true });

      const thumbnailFilename = `thumb_${fileId}.jpg`;
      const thumbnailPath = join(thumbnailDir, thumbnailFilename);

      await fs.writeFile(thumbnailPath, thumbnailBuffer);

      return `/api/files/${fileId}/thumbnail`;
    } catch (error) {
      logWarning('Thumbnail generation failed', 'file-upload-service', { error: error.message });
      return '';
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async checkFileAccess(fileRecord: Record<string, unknown>, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // Admin can access all files
    if (user?.role === 'ADMIN') {
      return;
    }

    // Users can access their own files
    if (fileRecord.userId === userId) {
      return;
    }

    // Check if file is shared (would need file sharing implementation)
    // For now, deny access
    throw new Error('Access denied');
  }
}

export const fileUploadService = new FileUploadService();
