'use client';

import React, { useState, useCallback } from 'react';
import { 
  ArrowDownTrayIcon, 
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
  DocumentChartBarIcon,
  PrinterIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ExportFormat {
  id: string;
  label: string;
  extension: string;
  mimeType: string;
  icon: React.ReactNode;
}

interface DataExporterProps {
  data: any[] | Record<string, any>;
  filename?: string;
  formats?: ExportFormat[];
  onExport?: (format: string, data: any) => void;
  transformData?: (data: any, format: string) => any;
  className?: string;
  buttonVariant?: 'primary' | 'secondary' | 'ghost';
  showPreview?: boolean;
}

const DEFAULT_FORMATS: ExportFormat[] = [
  {
    id: 'csv',
    label: 'CSV',
    extension: '.csv',
    mimeType: 'text/csv',
    icon: <TableCellsIcon className="h-5 w-5" />
  },
  {
    id: 'json',
    label: 'JSON',
    extension: '.json',
    mimeType: 'application/json',
    icon: <CodeBracketIcon className="h-5 w-5" />
  },
  {
    id: 'pdf',
    label: 'PDF',
    extension: '.pdf',
    mimeType: 'application/pdf',
    icon: <DocumentChartBarIcon className="h-5 w-5" />
  },
  {
    id: 'txt',
    label: 'Text',
    extension: '.txt',
    mimeType: 'text/plain',
    icon: <DocumentTextIcon className="h-5 w-5" />
  },
  {
    id: 'print',
    label: 'Print',
    extension: '',
    mimeType: '',
    icon: <PrinterIcon className="h-5 w-5" />
  }
];

export const DataExporter: React.FC<DataExporterProps> = ({
  data,
  filename = 'export',
  formats = DEFAULT_FORMATS,
  onExport,
  transformData,
  className = '',
  buttonVariant = 'primary',
  showPreview = false
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);

  // Convert data to CSV
  const convertToCSV = useCallback((data: any[]): string => {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    // Convert each row
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }, []);

  // Convert data to formatted JSON
  const convertToJSON = useCallback((data: any): string => {
    return JSON.stringify(data, null, 2);
  }, []);

  // Convert data to plain text
  const convertToText = useCallback((data: any): string => {
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'object') {
          return Object.entries(item)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        }
        return String(item);
      }).join('\n\n');
    }
    
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
        .join('\n\n');
    }
    
    return String(data);
  }, []);

  // Generate PDF (simplified - in production use a library like jsPDF)
  const generatePDF = useCallback((data: any): void => {
    // This is a simplified version - in production, use jsPDF or similar
    const content = convertToText(data);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              pre { white-space: pre-wrap; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>${filename}</h1>
            <pre>${content}</pre>
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, [convertToText, filename]);

  // Handle export
  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true);
    setSelectedFormat(format);
    
    try {
      // Transform data if transformer provided
      const exportData = transformData ? transformData(data, format.id) : data;
      
      let content: string | null = null;
      let blob: Blob | null = null;
      
      switch (format.id) {
        case 'csv':
          content = convertToCSV(Array.isArray(exportData) ? exportData : [exportData]);
          blob = new Blob([content], { type: format.mimeType });
          break;
          
        case 'json':
          content = convertToJSON(exportData);
          blob = new Blob([content], { type: format.mimeType });
          break;
          
        case 'txt':
          content = convertToText(exportData);
          blob = new Blob([content], { type: format.mimeType });
          break;
          
        case 'pdf':
          generatePDF(exportData);
          setExportedFormat(format.id);
          setIsExporting(false);
          setTimeout(() => setExportedFormat(null), 2000);
          return;
          
        case 'print':
          window.print();
          setExportedFormat(format.id);
          setIsExporting(false);
          setTimeout(() => setExportedFormat(null), 2000);
          return;
          
        default:
          // Custom export handler
          if (onExport) {
            onExport(format.id, exportData);
            setExportedFormat(format.id);
            setIsExporting(false);
            setTimeout(() => setExportedFormat(null), 2000);
            return;
          }
      }
      
      // Download file
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}${format.extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      // Set preview if enabled
      if (showPreview && content) {
        setPreviewData(content);
      }
      
      setExportedFormat(format.id);
      setTimeout(() => setExportedFormat(null), 2000);
      
      // Callback
      onExport?.(format.id, exportData);
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  }, [data, filename, transformData, onExport, convertToCSV, convertToJSON, convertToText, generatePDF, showPreview]);

  const getButtonClasses = () => {
    switch (buttonVariant) {
      case 'secondary':
        return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600';
      case 'ghost':
        return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Export Button */}
      {formats.length === 1 ? (
        <button
          onClick={() => handleExport(formats[0])}
          disabled={isExporting}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getButtonClasses()}
          `}
        >
          {isExporting ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : exportedFormat ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <ArrowDownTrayIcon className="h-5 w-5" />
          )}
          <span>Export {formats[0].label}</span>
        </button>
      ) : (
        <div>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${getButtonClasses()}
            `}
            aria-expanded={showDropdown}
            aria-haspopup="menu"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span>Export</span>
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          
          {/* Format Dropdown */}
          {showDropdown && (
            <div className="
              absolute z-10 mt-2 w-48
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-lg shadow-lg
              py-1
            "
            role="menu"
            >
              {formats.map(format => (
                <button
                  key={format.id}
                  onClick={() => handleExport(format)}
                  disabled={isExporting}
                  className="
                    w-full text-left px-4 py-2
                    flex items-center gap-3
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  role="menuitem"
                >
                  {format.icon}
                  <span className="flex-1">{format.label}</span>
                  {exportedFormat === format.id && (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  )}
                  {isExporting && selectedFormat?.id === format.id && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="
          fixed inset-0 z-50 
          flex items-center justify-center p-4
          bg-black/50
        ">
          <div className="
            bg-white dark:bg-gray-800
            rounded-lg shadow-xl
            max-w-4xl max-h-[80vh]
            w-full
            flex flex-col
          ">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Export Preview</h3>
              <button
                onClick={() => setPreviewData(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {previewData}
              </pre>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewData);
                  setPreviewData(null);
                }}
                className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExporter;