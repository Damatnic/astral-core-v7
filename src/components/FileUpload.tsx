'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import Image from 'next/image';
import Button from './ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { toast } from 'react-hot-toast';
import { FileCategory } from '@prisma/client';

interface FileUploadProps {
  category: FileCategory;
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
}

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  category: FileCategory;
}

interface FileWithPreview extends File {
  preview?: string;
  id?: string;
  progress?: number;
  error?: string;
  uploading?: boolean;
}

const FILE_CATEGORIES = {
  CONSENT_FORM: {
    label: 'Consent Form',
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  INSURANCE: {
    label: 'Insurance Document',
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  MEDICAL_RECORD: {
    label: 'Medical Record',
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'text/plain': ['.txt']
    },
    maxSize: 20 * 1024 * 1024 // 20MB
  },
  SESSION_NOTE: {
    label: 'Session Note',
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc']
    },
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  ASSESSMENT: {
    label: 'Assessment',
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 15 * 1024 * 1024 // 15MB
  },
  REPORT: {
    label: 'Report',
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  OTHER: {
    label: 'Other Document',
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'text/plain': ['.txt']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  }
};

export default function FileUpload({
  category,
  onUploadComplete,
  maxFiles = 5,
  accept
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);

  const categoryConfig = FILE_CATEGORIES[category];
  const acceptTypes = accept || categoryConfig.accept;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: { code: string; message: string }) => {
          if (error.code === 'file-too-large') {
            toast.error(
              `${file.name} is too large (max ${formatFileSize(categoryConfig.maxSize)})`
            );
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name} has invalid file type`);
          } else {
            toast.error(`Error with ${file.name}: ${error.message}`);
          }
        });
      });

      // Add accepted files
      const newFiles = acceptedFiles.map(file => {
        const fileWithPreview = Object.assign(file, {
          ...(file.type.startsWith('image/') ? { preview: URL.createObjectURL(file) } : {}),
          id: Math.random().toString(36).substr(2, 9),
          progress: 0,
          uploading: false
        });
        return fileWithPreview as FileWithPreview;
      });

      setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
    },
    [categoryConfig.maxSize, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptTypes,
    maxSize: categoryConfig.maxSize,
    maxFiles: maxFiles - files.length,
    disabled: uploading || files.length >= maxFiles
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      for (const file of files) {
        // Update file state to show uploading
        setFiles(prev =>
          prev.map(f => (f.id === file.id ? { ...f, uploading: true, progress: 0 } : f))
        );

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', category);
          formData.append('description', description);
          formData.append('isPrivate', isPrivate.toString());

          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
          }

          const result = await response.json();
          uploadedFiles.push(result.data);

          // Update progress to 100%
          setFiles(prev =>
            prev.map(f => (f.id === file.id ? { ...f, progress: 100, uploading: false } : f))
          );

          toast.success(`${file.name} uploaded successfully`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setFiles(prev =>
            prev.map(f => (f.id === file.id ? { ...f, error: errorMessage, uploading: false } : f))
          );
          toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        }
      }

      if (uploadedFiles.length > 0) {
        onUploadComplete?.(uploadedFiles);
      }

      // Clear successful uploads
      setFiles(prev => prev.filter(f => f.error));

      if (files.filter(f => !f.error).length > 0) {
        setDescription('');
      }
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + (sizes[i] || 'Bytes');
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType === 'text/plain') return '📃';
    return '📎';
  };

  return (
    <Card className='w-full max-w-2xl mx-auto'>
      <CardHeader>
        <CardTitle>Upload {categoryConfig.label}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${uploading || files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className='space-y-4'>
            <div className='text-6xl'>📁</div>
            {isDragActive ? (
              <p className='text-lg font-medium text-blue-600 dark:text-blue-400'>
                Drop files here...
              </p>
            ) : (
              <div>
                <p className='text-lg font-medium text-gray-900 dark:text-white'>
                  Drop files here or click to browse
                </p>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>
                  Max {maxFiles} files, up to {formatFileSize(categoryConfig.maxSize)} each
                </p>
                <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                  Accepted: {Object.values(acceptTypes).flat().join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* File options */}
        {files.length > 0 && (
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                placeholder='Add a description for these files...'
              />
            </div>

            <div className='flex items-center'>
              <input
                type='checkbox'
                id='private'
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className='mr-2'
              />
              <label htmlFor='private' className='text-sm text-gray-700 dark:text-gray-200'>
                Keep files private (only you can access)
              </label>
            </div>
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-gray-900 dark:text-white'>
              Files to upload ({files.length}/{maxFiles})
            </h4>
            <div className='space-y-2'>
              {files.map(file => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    file.error
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className='flex items-center space-x-3'>
                    <div className='flex-shrink-0'>
                      {file.preview ? (
                        <Image
                          src={file.preview}
                          alt={`Preview of ${file.name}`}
                          width={40}
                          height={40}
                          className='object-cover rounded'
                          unoptimized={true}
                          onLoad={() => URL.revokeObjectURL(file.preview!)}
                        />
                      ) : (
                        <div className='text-2xl'>{getFileIcon(file.type)}</div>
                      )}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                        {file.name}
                      </p>
                      <p className='text-sm text-gray-500'>{formatFileSize(file.size)}</p>
                      {file.error && (
                        <p className='text-sm text-red-600 dark:text-red-400'>{file.error}</p>
                      )}
                    </div>
                  </div>

                  <div className='flex items-center space-x-2'>
                    {file.uploading && (
                      <div className='w-8 h-8'>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
                      </div>
                    )}
                    {!file.uploading && !file.error && (
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => removeFile(file.id!)}
                        className='text-red-600 hover:text-red-700'
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        {files.length > 0 && (
          <div className='flex justify-end space-x-2'>
            <Button variant='ghost' onClick={() => setFiles([])} disabled={uploading}>
              Clear All
            </Button>
            <Button onClick={uploadFiles} disabled={uploading || files.length === 0}>
              {uploading
                ? 'Uploading...'
                : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
