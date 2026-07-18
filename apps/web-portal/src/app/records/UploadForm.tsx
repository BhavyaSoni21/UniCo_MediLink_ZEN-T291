'use client';

import { useActionState, useEffect, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { uploadRecord, type ActionState } from './actions';
import { BrutalButton } from '@/components/brutal';

const initialState: ActionState = {};

const RECORD_TYPES = ['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'SURGERY', 'TELECONSULTATION'];

export function UploadForm() {
  const [state, formAction, isPending] = useActionState(uploadRecord, initialState);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  // Dropped files are assigned to the real <input type=file> via
  // DataTransfer, so the form still submits as ordinary multipart/form-data
  // through the Server Action — no separate client-side fetch to the API.
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      setFileName(file.name);
    }
  }

  return (
    <form action={formAction} className="brutal-card p-6 space-y-4">
      <h2 className="font-display font-black text-2xl">UPLOAD A REPORT</h2>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed border-black rounded-brutal p-8 text-center cursor-pointer ${
          dragOver ? 'bg-brand-yellow' : 'bg-white'
        }`}
      >
        <p className="font-bold">{fileName ?? 'Drag & drop a PDF/PNG here, or click to browse'}</p>
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-bold uppercase">Record type</label>
          <select name="recordType" defaultValue="CONSULTATION" className="brutal-input mt-1">
            {RECORD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Summary (optional)</label>
          <input name="summary" className="brutal-input mt-1" />
        </div>
      </div>

      {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
      {state.success && <p className="text-sm font-bold text-brand-teal">Uploaded.</p>}
      <BrutalButton type="submit" disabled={isPending}>
        {isPending ? 'Uploading…' : 'Upload'}
      </BrutalButton>
    </form>
  );
}
