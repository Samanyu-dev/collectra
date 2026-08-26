'use client';

import { motion } from 'framer-motion';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Target, Plus, Trash2 } from 'lucide-react';
import { ProgressBar } from '@/components/ui/collectra-ui';
import { createSetCompletionProject, deleteProject } from '@/lib/actions/projects';

interface ProjectItem {
  id: string;
  name: string;
  type: string;
  status: string;
  setName: string | null;
  cardsAcquired: number;
  cardsNeeded: number;
  total: number;
  progress: number;
}

interface AvailableSet {
  id: string;
  name: string;
  _count: { cards: number };
}

export function ProjectsClient({ projects, availableSets }: { projects: ProjectItem[]; availableSets: AvailableSet[] }) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate() {
    if (!selectedSetId) return;
    startTransition(async () => {
      await createSetCompletionProject(selectedSetId);
      setShowPicker(false);
      setSelectedSetId('');
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProject(id);
      router.refresh();
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-2">
            <BookOpen size={16} /> Projects
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Set-completion goals
          </h1>
          <p className="text-foreground/50 mt-2 max-w-2xl">
            Tracked against your real collection, not a checklist you have to update by hand.
          </p>
        </div>
        <button
          onClick={() => setShowPicker((s) => !s)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Project
        </button>
      </motion.div>

      {showPicker && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-foreground/5 border border-foreground/10 rounded-3xl p-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <select
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value)}
            aria-label="Choose a set to complete"
            className="flex-1 bg-background/50 border border-foreground/10 rounded-full px-4 py-2.5 text-sm text-foreground focus:outline-none"
          >
            <option value="">Choose a set to complete...</option>
            {availableSets.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s._count.cards} cards)</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={!selectedSetId || isPending}
            className="bg-foreground text-background px-6 py-2.5 rounded-full text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            Start Project
          </button>
        </motion.div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-32 text-foreground/40 border border-dashed border-foreground/10 rounded-3xl bg-foreground/5">
          <Target size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium text-foreground">No active projects</p>
          <p className="text-sm mt-1">Start a set-completion project to track your progress toward finishing a checklist.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`bg-foreground/5 border border-foreground/10 rounded-3xl p-6 hover:border-primary/50 transition-colors group relative ${
                project.progress >= 90 ? "foil-frame" : ""
              }`}
            >
              <button
                onClick={() => handleDelete(project.id)}
                className="absolute top-4 right-4 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 transition-opacity text-foreground/40 hover:text-red-400"
                aria-label="Delete project"
                title="Delete project"
              >
                <Trash2 size={16} />
              </button>

              <div className="flex items-start justify-between mb-4 pr-8">
                <div>
                  <h2 className="text-xl font-bold mb-1">{project.name}</h2>
                  {project.setName && <p className="text-sm text-foreground/50">{project.setName}</p>}
                </div>
                <div className="bg-foreground/10 px-3 py-1 rounded-full text-xs font-medium capitalize shrink-0 text-foreground/70">
                  {project.type.replace('_', ' ').toLowerCase()}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-mono text-foreground/50">{project.cardsAcquired} / {project.total} Cards</span>
                  <span className="font-bold">{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} color="var(--primary)" height={6} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
