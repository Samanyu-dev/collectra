import Link from 'next/link';
import { Upload, Database, FileSpreadsheet, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { MigrationUploadForm } from './migration-upload-form';

export const dynamic = 'force-dynamic';

const ADAPTER_LABELS: Record<string, { name: string; icon: React.ReactNode }> = {
  tcgplayer_v1: { name: 'TCGPlayer Export', icon: <Database size={32} className="text-blue-400" /> },
  generic_csv: { name: 'Generic Spreadsheet', icon: <FileSpreadsheet size={32} className="text-green-400" /> },
};

export default async function MigrationEngineHome() {
  const user = await requireUser();
  const sessions = await prisma.migrationSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans pb-32">

      {/* Hero Banner */}
      <section className="relative w-full py-24 flex items-center justify-center border-b border-foreground/10 bg-elevated">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-50" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-mono uppercase tracking-widest text-primary mb-4">
            <Upload size={14} /> Migration Engine
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground drop-shadow-2xl">
            Import your Legacy
          </h1>
          <p className="text-lg md:text-xl text-foreground/50 max-w-2xl mx-auto font-serif">
            Migrate your collection from a spreadsheet or another tracker's export.
            We automatically match variants and stage anything ambiguous for your review.
          </p>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-6 mt-16 space-y-16">

        {/* Supported formats */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-display font-medium">Supported Formats</h2>
            <p className="text-foreground/40 text-sm mt-1">The format is detected automatically from your file's headers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(ADAPTER_LABELS).map(([id, adapter]) => (
              <div key={id} className="relative p-8 rounded-3xl bg-foreground/5 border border-foreground/10 text-left overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute top-0 right-0 p-6 opacity-20">
                  {adapter.icon}
                </div>
                <div className="relative z-10 mt-auto">
                  <h3 className="text-2xl font-bold">{adapter.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Upload */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-display font-medium">Upload File</h2>
            <p className="text-foreground/40 text-sm mt-1">Drag and drop your .csv file here.</p>
          </div>
          <MigrationUploadForm />
        </section>

        {/* Recent Imports */}
        {sessions.length > 0 && (
          <section>
            <div className="mb-8">
              <h2 className="text-2xl font-display font-medium">Recent Imports</h2>
            </div>
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={session.status === 'COMPLETED' ? '/shelf' : `/migration/${session.id}/review`}
                  className="flex items-center justify-between p-5 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 hover:border-foreground/20 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/40">
                      {session.status === 'COMPLETED' ? <CheckCircle2 size={18} className="text-green-400" /> : <Clock size={18} />}
                    </div>
                    <div>
                      <p className="font-medium">{ADAPTER_LABELS[session.sourceAdapter]?.name || session.sourceAdapter}</p>
                      <p className="text-xs text-foreground/40 font-mono mt-0.5">
                        {session.totalRows} rows • {session.matchedRows} matched • {session.reviewRows} need review
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-foreground/40">{session.status}</span>
                    <ArrowRight size={16} className="text-foreground/30 group-hover:translate-x-1 group-hover:text-foreground/60 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
