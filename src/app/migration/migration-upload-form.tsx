'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Upload } from 'lucide-react';
import { createMigrationSession } from '@/lib/migration/actions/create-session';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-6 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
    >
      {pending ? 'Analyzing…' : 'Upload & Analyze'}
    </button>
  );
}

export function MigrationUploadForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) setFileName(file.name);
  }

  return (
    <form action={createMigrationSession}>
      <label
        htmlFor="migration-file-input"
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (inputRef.current && e.dataTransfer.files[0]) {
            inputRef.current.files = e.dataTransfer.files;
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={`w-full aspect-[4/1] md:aspect-[6/1] border-2 border-dashed rounded-3xl bg-foreground/[0.02] flex items-center justify-center transition-colors cursor-pointer group focus-within:ring-2 focus-within:ring-primary/50 ${
          dragActive ? 'border-primary/60 bg-foreground/[0.05]' : 'border-foreground/20 hover:bg-foreground/[0.05] hover:border-primary/50'
        }`}
      >
        <input
          ref={inputRef}
          id="migration-file-input"
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/40 group-hover:text-primary group-hover:scale-110 transition-all">
            <Upload size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground/80">
              {fileName || 'Click to browse or drag file here'}
            </p>
            <p className="text-sm text-foreground/40 mt-1 font-mono">CSV only • Max size: 10MB</p>
          </div>
        </div>
      </label>
      <div className="flex justify-center">
        <SubmitButton disabled={!fileName} />
      </div>
    </form>
  );
}
