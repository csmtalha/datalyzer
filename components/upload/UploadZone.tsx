'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Sparkles, Link2, Globe, ClipboardPaste, Wand2, X } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  onFetchUrl: (url: string) => void;
  onLoadSample: () => void;
  isLoading: boolean;
  error: string | null;
}

const FILE_BADGES = ['.CSV', '.XLSX', '.JSON', '.HTML', '.YAML', '.TOML', '.MD', '.PDF', '.DOCX', '.TSV', '.XML', '.SQL', '.LOG', '+MORE'];

const EXAMPLE_URLS = [
  { label: 'World Population', url: 'https://raw.githubusercontent.com/datasets/population/main/data/population.csv' },
  { label: 'S&P 500 Companies', url: 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv' },
  { label: 'Country Codes', url: 'https://raw.githubusercontent.com/datasets/country-codes/master/data/country-codes.csv' },
];

export default function UploadZone({ onUpload, onFetchUrl, onLoadSample, isLoading, error }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    onUpload(file);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onFetchUrl(trimmed);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setUrlInput(text.trim());
      }
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit mx-auto">
        <button
          onClick={() => setMode('upload')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'upload' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload File
        </button>
        <button
          onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'url' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Globe className="w-4 h-4" />
          Fetch URL
        </button>
      </div>

      {mode === 'upload' ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isLoading && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer
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
            accept="*/*"
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
                  <p className="text-sm text-slate-500 mt-1">Cleaning, renaming columns & running analysis</p>
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
                    {isDragging ? 'Drop to analyze' : 'Upload any data file'}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Drag & drop or click to browse — auto-detects format & renames columns
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-center mt-2">
                  {FILE_BADGES.map(ext => (
                    <span key={ext} className="px-2.5 py-0.5 bg-slate-800 rounded-full text-[11px] text-slate-400 font-mono border border-slate-700">
                      {ext}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-slate-700 rounded-2xl bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-slate-300">Fetch data from URL</span>
          </div>
          <p className="text-xs text-slate-500 -mt-2">
            Paste a link to any CSV, JSON, or API endpoint. Google Sheets and GitHub links are auto-converted.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                placeholder="https://example.com/data.csv or Google Sheets link..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors pr-10"
              />
              {urlInput && (
                <button
                  onClick={() => setUrlInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handlePaste}
              disabled={isLoading}
              className="px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-cyan-400 hover:border-slate-600 transition-colors"
              title="Paste from clipboard"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
            <button
              onClick={handleUrlSubmit}
              disabled={isLoading || !urlInput.trim()}
              className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Fetch
            </button>
          </div>

          {/* Quick picks */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 block mb-2">Try a sample dataset</span>
            <div className="flex gap-2 flex-wrap">
              {EXAMPLE_URLS.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => { setUrlInput(ex.url); onFetchUrl(ex.url); }}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all disabled:opacity-40"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Bottom features + sample data */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Smart format detection</span>
          </div>
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            <span>Auto column naming</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Deep analysis</span>
          </div>
        </div>
        <button
          onClick={onLoadSample}
          disabled={isLoading}
          className="text-xs text-slate-500 hover:text-cyan-400 transition-colors disabled:opacity-40"
        >
          Try sample data
        </button>
      </div>
    </div>
  );
}
