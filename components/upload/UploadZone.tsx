'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

const ACCEPTED = ['.csv', '.xlsx', '.xls', '.pdf', '.docx'];
const ACCEPTED_MIME = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function UploadZone({ onUpload, isLoading, error }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = useCallback((file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setDragError(`Unsupported file type: ${ext}. Use ${ACCEPTED.join(', ')}`);
      return;
    }
    setDragError(null);
    onUpload(file);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  }, [validateAndUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
    e.target.value = '';
  };

  const displayError = error || dragError;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
          transition-all duration-300 group
          ${isDragging
            ? 'border-cyan-400 bg-cyan-950/30 scale-[1.02]'
            : 'border-slate-600 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-800/40'
          }
          ${isLoading ? 'cursor-not-allowed opacity-70' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <>
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-200">Analyzing your data...</p>
                <p className="text-sm text-slate-500 mt-1">This may take a moment</p>
              </div>
            </>
          ) : (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
                ${isDragging ? 'bg-cyan-500/20 scale-110' : 'bg-slate-800 group-hover:bg-cyan-500/10'}`}>
                <Upload className={`w-7 h-7 transition-colors ${isDragging ? 'text-cyan-300' : 'text-slate-400 group-hover:text-cyan-400'}`} />
              </div>
              <div>
                <p className="text-xl font-semibold text-slate-200">
                  {isDragging ? 'Drop to analyze' : 'Upload your dataset'}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Drag & drop or click to browse
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center mt-2">
                {ACCEPTED.map(ext => (
                  <span key={ext} className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400 font-mono border border-slate-700">
                    {ext.toUpperCase()}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {displayError && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{displayError}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Auto-detects columns & types</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Up to 10,000 rows</span>
        </div>
      </div>
    </div>
  );
}
