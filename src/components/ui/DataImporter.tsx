'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  CloudArrowUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ValidationRule {
  field: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  transform?: (value: any) => any;
}

interface ImportSchema {
  fields: ValidationRule[];
  maxRows?: number;
  allowExtraFields?: boolean;
  requireHeaders?: boolean;
}

interface ImportResult {
  valid: any[];
  invalid: Array<{
    row: number;
    data: any;
    errors: string[];
  }>;
  warnings: string[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    skipped: number;
  };
}

interface DataImporterProps {
  schema: ImportSchema;
  onImport: (data: any[]) => void | Promise<void>;
  acceptedFormats?: string[];
  maxFileSize?: number;
  showPreview?: boolean;
  autoValidate?: boolean;
  className?: string;
}

export const DataImporter: React.FC<DataImporterProps> = ({
  schema,
  onImport,
  acceptedFormats = ['.csv', '.json', '.txt'],
  maxFileSize = 5 * 1024 * 1024, // 5MB
  showPreview = true,
  autoValidate = true,
  className = ''
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'validate' | 'preview' | 'complete'>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate single value against rule
  const validateValue = (value: any, rule: ValidationRule): string[] => {
    const errors: string[] = [];

    // Required check
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push(`${rule.field} is required`);
      return errors;
    }

    // Skip further validation if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return errors;
    }

    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${rule.field} must be a number`);
          } else {
            const num = Number(value);
            if (rule.min !== undefined && num < rule.min) {
              errors.push(`${rule.field} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && num > rule.max) {
              errors.push(`${rule.field} must be at most ${rule.max}`);
            }
          }
          break;

        case 'boolean':
          if (!['true', 'false', '1', '0', true, false, 1, 0].includes(value)) {
            errors.push(`${rule.field} must be true or false`);
          }
          break;

        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(`${rule.field} must be a valid date`);
          }
          break;

        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${rule.field} must be a valid email`);
          }
          break;

        case 'url':
          try {
            new URL(value);
          } catch {
            errors.push(`${rule.field} must be a valid URL`);
          }
          break;

        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${rule.field} must be a string`);
          } else {
            if (rule.min !== undefined && value.length < rule.min) {
              errors.push(`${rule.field} must be at least ${rule.min} characters`);
            }
            if (rule.max !== undefined && value.length > rule.max) {
              errors.push(`${rule.field} must be at most ${rule.max} characters`);
            }
          }
          break;
      }
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(String(value))) {
      errors.push(`${rule.field} has invalid format`);
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (typeof result === 'string') {
        errors.push(result);
      } else if (!result) {
        errors.push(`${rule.field} validation failed`);
      }
    }

    return errors;
  };

  // Parse CSV content
  const parseCSV = (content: string): any[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  };

  // Parse JSON content
  const parseJSON = (content: string): any[] => {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  };

  // Validate imported data
  const validateData = useCallback((data: any[]): ImportResult => {
    const result: ImportResult = {
      valid: [],
      invalid: [],
      warnings: [],
      summary: {
        total: data.length,
        valid: 0,
        invalid: 0,
        skipped: 0
      }
    };

    // Check max rows
    if (schema.maxRows && data.length > schema.maxRows) {
      result.warnings.push(`Only first ${schema.maxRows} rows will be imported`);
      data = data.slice(0, schema.maxRows);
    }

    // Validate each row
    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      const processedRow: any = {};

      // Check for extra fields
      if (!schema.allowExtraFields) {
        const allowedFields = new Set(schema.fields.map(f => f.field));
        const extraFields = Object.keys(row).filter(key => !allowedFields.has(key));
        if (extraFields.length > 0) {
          rowErrors.push(`Unexpected fields: ${extraFields.join(', ')}`);
        }
      }

      // Validate each field
      schema.fields.forEach(rule => {
        const value = row[rule.field];
        const fieldErrors = validateValue(value, rule);
        rowErrors.push(...fieldErrors);

        // Transform value if valid and transformer provided
        if (fieldErrors.length === 0 && rule.transform) {
          processedRow[rule.field] = rule.transform(value);
        } else {
          processedRow[rule.field] = value;
        }
      });

      if (rowErrors.length === 0) {
        result.valid.push(processedRow);
        result.summary.valid++;
      } else {
        result.invalid.push({
          row: index + 1,
          data: row,
          errors: rowErrors
        });
        result.summary.invalid++;
      }
    });

    return result;
  }, [schema]);

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (file.size > maxFileSize) {
      setValidationErrors([`File size exceeds ${maxFileSize / 1024 / 1024}MB limit`]);
      return;
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!acceptedFormats.includes(extension)) {
      setValidationErrors([`File format not supported. Accepted: ${acceptedFormats.join(', ')}`]);
      return;
    }

    setFile(file);
    setValidationErrors([]);
    setIsProcessing(true);

    try {
      const content = await file.text();
      let data: any[] = [];

      // Parse based on file type
      if (extension === '.csv') {
        data = parseCSV(content);
      } else if (extension === '.json') {
        data = parseJSON(content);
      } else {
        // Try to auto-detect format
        try {
          data = parseJSON(content);
        } catch {
          data = parseCSV(content);
        }
      }

      // Validate if auto-validate is enabled
      if (autoValidate) {
        const result = validateData(data);
        setImportResult(result);
        setPreviewData(result.valid.slice(0, 10));
        setStep(result.invalid.length > 0 ? 'validate' : 'preview');
      } else {
        setPreviewData(data.slice(0, 10));
        setStep('preview');
      }
    } catch (error) {
      setValidationErrors([`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importResult) return;

    setIsProcessing(true);
    try {
      await onImport(importResult.valid);
      setStep('complete');
    } catch (error) {
      setValidationErrors([`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset importer
  const reset = () => {
    setFile(null);
    setImportResult(null);
    setPreviewData([]);
    setValidationErrors([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`data-importer ${className}`}>
      {/* Upload Step */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files[0]) {
              handleFileSelect(e.dataTransfer.files[0]);
            }
          }}
          className={`
            border-2 border-dashed rounded-lg p-8
            transition-colors
            ${isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="sr-only"
          />

          <div className="text-center">
            <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-2"
            >
              Choose File
            </button>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              or drag and drop
            </p>
            
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Supported formats: {acceptedFormats.join(', ')} (max {maxFileSize / 1024 / 1024}MB)
            </p>
          </div>

          {validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {validationErrors.map((error, index) => (
                <p key={index} className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Validation Step */}
      {step === 'validate' && importResult && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Validation Results</h3>
            
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {importResult.summary.total}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.summary.valid}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Valid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult.summary.invalid}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Invalid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {importResult.summary.skipped}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Skipped</div>
              </div>
            </div>

            {/* Warnings */}
            {importResult.warnings.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    {importResult.warnings.map((warning, index) => (
                      <p key={index} className="text-sm text-yellow-700 dark:text-yellow-400">
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Invalid Rows */}
            {importResult.invalid.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600 dark:text-red-400">
                  Invalid Rows ({importResult.invalid.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {importResult.invalid.slice(0, 10).map((item, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm"
                    >
                      <div className="font-medium text-red-700 dark:text-red-400">
                        Row {item.row}
                      </div>
                      <ul className="mt-1 text-red-600 dark:text-red-500 list-disc list-inside">
                        {item.errors.map((error, errorIndex) => (
                          <li key={errorIndex}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {importResult.invalid.length > 10 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      And {importResult.invalid.length - 10} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={reset}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </button>
            {importResult.valid.length > 0 && (
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Preview Valid Data ({importResult.valid.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && showPreview && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    {Object.keys(previewData[0] || {}).map(key => (
                      <th 
                        key={key}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {previewData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value: any, valueIndex) => (
                        <td 
                          key={valueIndex}
                          className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
                        >
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importResult && importResult.valid.length > 10 && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Showing first 10 of {importResult.valid.length} rows
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep('validate')}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {isProcessing ? 'Importing...' : `Import ${importResult?.valid.length || 0} Rows`}
            </button>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="text-center py-8">
          <CheckCircleIcon className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Successfully imported {importResult?.valid.length || 0} rows
          </p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
};

export default DataImporter;