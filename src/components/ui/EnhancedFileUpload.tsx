'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onFilesSelected: (files: File[]) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileTypeIcon = (type: string) => {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  return '📎';
};

export const EnhancedFileUpload: React.FC<FileUploadProps> = ({
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  onFilesSelected,
  onError,
  className = '',
  disabled = false
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const acceptedTypes = accept.split(',').map(t => t.trim());
  const acceptedExtensions = acceptedTypes
    .filter(t => t.startsWith('.'))
    .map(t => t.toLowerCase());
  const acceptedMimeTypes = acceptedTypes
    .filter(t => !t.startsWith('.'))
    .map(t => t.toLowerCase());

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(maxSize)})` 
      };
    }

    // Check file type
    if (accept !== '*') {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const fileMimeType = file.type.toLowerCase();
      
      const isValidExtension = acceptedExtensions.some(ext => fileExtension === ext);
      const isValidMimeType = acceptedMimeTypes.some(mime => {
        if (mime.endsWith('/*')) {
          return fileMimeType.startsWith(mime.replace('/*', '/'));
        }
        return fileMimeType === mime;
      });

      if (!isValidExtension && !isValidMimeType) {
        return { 
          valid: false, 
          error: `File type not accepted. Allowed: ${accept}` 
        };
      }
    }

    return { valid: true };
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      setValidationError(`Maximum ${maxFiles} files allowed`);
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: UploadedFile[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const validation = validateFile(file);
      
      if (validation.valid) {
        const uploadedFile: UploadedFile = {
          file,
          id: `${Date.now()}-${Math.random()}`,
          status: 'pending',
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        };
        validFiles.push(uploadedFile);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      setValidationError(errors.join('\n'));
      onError?.(errors.join('\n'));
    } else {
      setValidationError(null);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      onFilesSelected(validFiles.map(f => f.file));
    }
  }, [files.length, maxFiles, accept, maxSize, onFilesSelected, onError]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled) return;

    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center
          transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload files"
        aria-disabled={disabled}
        aria-describedby="upload-help"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
          className="sr-only"
          aria-label="File input"
        />

        <CloudArrowUpIcon className={`
          mx-auto h-12 w-12 
          ${isDragging ? 'text-blue-500' : 'text-gray-400'}
          transition-colors duration-200
        `} />
        
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isDragging ? (
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Drop files here
            </span>
          ) : (
            <>
              <span className="font-semibold">Click to upload</span> or drag and drop
            </>
          )}
        </p>
        
        <p id="upload-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {accept === '*' ? 'Any file type' : `Accepted: ${accept}`}
          {' • '}
          Max size: {formatFileSize(maxSize)}
          {' • '}
          Max {maxFiles} {maxFiles === 1 ? 'file' : 'files'}
        </p>
      </div>

      {/* Validation Errors */}
      {validationError && (
        <div 
          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                Upload Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                {validationError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Uploaded Files ({files.length}/{maxFiles})
            </h3>
            <button
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
              type="button"
            >
              Clear all
            </button>
          </div>

          <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
            {files.map(file => (
              <li key={file.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center space-x-3">
                  {/* File Preview/Icon */}
                  {file.preview ? (
                    <img 
                      src={file.preview} 
                      alt={file.file.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 flex items-center justify-center text-2xl">
                      {getFileTypeIcon(file.file.type)}
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.file.size)}
                    </p>
                  </div>

                  {/* Status */}
                  {file.status === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" aria-label="Upload successful" />
                  )}
                  {file.status === 'error' && (
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-label="Upload failed" />
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    aria-label={`Remove ${file.file.name}`}
                    type="button"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {/* Progress Bar */}
                {file.status === 'uploading' && file.progress !== undefined && (
                  <div className="mt-2">
                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                        role="progressbar"
                        aria-valuenow={file.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {file.error && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{file.error}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUpload;