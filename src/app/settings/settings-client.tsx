'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  User, Sun, Moon, Download, Upload, Shield, Layers, Heart, Target, Check, LogOut, Globe, Copy, DollarSign, Sparkles, CreditCard,
} from 'lucide-react';
import { useTheme } from '@/components/ui/theme-toggle';
import { exportUserData } from '@/lib/actions/export-data';
import { signOut } from '@/lib/actions/auth';
import { updateProfile } from '@/lib/actions/profile';
import { ProgressBar } from '@/components/ui/collectra-ui';
import { UpgradeButton, ManageBillingButton } from '@/components/billing/billing-actions';

interface Stats {
  instanceCount: number;
  wishlistCount: number;
  activeProjectCount: number;
  migrationCount: number;
}

interface BillingInfo {
  isPro: boolean;
  setsUsed: number;
  setLimit: number;
  scansUsedThisWeek: number;
  scanLimitPerWeek: number;
  subscription: { status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null;
}

interface ProfileFields {
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  showValuePublicly: boolean;
}

function SettingsSection({ title, description, icon: Icon, children }: { title: string; description?: string; icon: any; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-foreground/5 border border-foreground/10 rounded-3xl p-6 md:p-8 space-y-6"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">{title}</h2>
          {description && <p className="text-sm text-foreground/50 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

export function SettingsClient({ user, stats, billing }: { user: ({ name: string | null; email: string } & ProfileFields) | null; stats: Stats; billing: BillingInfo }) {
  const { isLight, mounted, setTheme } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collectra-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } finally {
      setExporting(false);
    }
  }

  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? false);
  const [showValuePublicly, setShowValuePublicly] = useState(user?.showValuePublicly ?? false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const result = await updateProfile({ username, bio, avatarUrl, isPublic, showValuePublicly });
      if ('error' in result) {
        setProfileMessage({ type: 'error', text: result.error });
      } else {
        setProfileMessage({ type: 'success', text: 'Profile updated.' });
        setTimeout(() => setProfileMessage(null), 3000);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  const profileUrl = username ? `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${username}` : null;

  function handleCopyLink() {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 pb-32 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-foreground/50 mt-2">Manage your account, appearance, and data.</p>
      </div>

      <SettingsSection title="Account" icon={User}>
        {user ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">{user.name || 'Unnamed Collector'}</p>
                <p className="text-sm text-foreground/50">{user.email}</p>
              </div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-foreground/50">No user found.</p>
        )}
      </SettingsSection>

      <SettingsSection title="Billing" description={billing.isPro ? 'You have full Pro access.' : 'Free plan, upgrade anytime.'} icon={billing.isPro ? Sparkles : CreditCard}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {billing.isPro && <Sparkles size={12} />} {billing.isPro ? 'Pro' : 'Free'}
            </span>
            {billing.isPro && billing.subscription && (
              <span className="text-xs text-foreground/50">
                {billing.subscription.cancelAtPeriodEnd
                  ? `Cancels ${new Date(billing.subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : `Renews ${new Date(billing.subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
            )}
          </div>

          {!billing.isPro && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-foreground/50 mb-1.5">
                  <span>Sets tracked</span>
                  <span>{billing.setsUsed} / {billing.setLimit}</span>
                </div>
                <ProgressBar value={billing.setsUsed} max={billing.setLimit} />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-foreground/50 mb-1.5">
                  <span>Scans this week</span>
                  <span>{billing.scansUsedThisWeek} / {billing.scanLimitPerWeek}</span>
                </div>
                <ProgressBar value={billing.scansUsedThisWeek} max={billing.scanLimitPerWeek} />
              </div>
            </div>
          )}

          {billing.isPro ? (
            <ManageBillingButton className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors disabled:opacity-50" />
          ) : (
            <UpgradeButton className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50" />
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Appearance" description="Choose how Collectra looks on this device." icon={isLight ? Sun : Moon}>
        {mounted && (
          <div className="flex gap-3">
            <button
              onClick={() => setTheme(false)}
              aria-pressed={!isLight}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-medium transition-colors ${
                !isLight ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 border-foreground/10 text-foreground/70 hover:bg-foreground/10'
              }`}
            >
              <Moon size={16} /> Dark {!isLight && <Check size={14} />}
            </button>
            <button
              onClick={() => setTheme(true)}
              aria-pressed={isLight}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-medium transition-colors ${
                isLight ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 border-foreground/10 text-foreground/70 hover:bg-foreground/10'
              }`}
            >
              <Sun size={16} /> Light {isLight && <Check size={14} />}
            </button>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Your Data" description="A snapshot of everything Collectra is tracking for you." icon={Layers}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Shield} label="Instances" value={stats.instanceCount} />
          <StatTile icon={Heart} label="Wishlist" value={stats.wishlistCount} />
          <StatTile icon={Target} label="Active Projects" value={stats.activeProjectCount} />
          <StatTile icon={Upload} label="Imports Run" value={stats.migrationCount} />
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
        >
          {exported ? <Check size={16} className="text-green-400" /> : <Download size={16} />}
          {exporting ? 'Preparing export…' : exported ? 'Downloaded' : 'Download my data (JSON)'}
        </button>
      </SettingsSection>

      <SettingsSection title="Import & Migration" description="Bring in a collection from a spreadsheet or another tracker." icon={Upload}>
        <Link
          href="/migration"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors"
        >
          <Upload size={16} /> Go to Migration Engine
        </Link>
      </SettingsSection>

      <SettingsSection title="Public Profile" description="Share a read-only view of your collection. Off by default." icon={Globe}>
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. cardcollector"
              className="mt-1.5 w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="bio" className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="A line about your collection"
              className="mt-1.5 w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div>
            <label htmlFor="avatarUrl" className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Avatar URL</label>
            <input
              id="avatarUrl"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1.5 w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-foreground/5 border border-foreground/10 cursor-pointer">
            <span className="flex items-center gap-3">
              <Globe size={16} className="text-foreground/40 shrink-0" />
              <span>
                <span className="block text-sm font-medium text-foreground">Make profile public</span>
                <span className="block text-xs text-foreground/50">Completion, franchise breakdown, rarest &amp; latest pull.</span>
              </span>
            </span>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-5 h-5 accent-primary shrink-0" />
          </label>

          <label className={`flex items-center justify-between gap-4 p-4 rounded-2xl bg-foreground/5 border border-foreground/10 ${isPublic ? 'cursor-pointer' : 'opacity-50'}`}>
            <span className="flex items-center gap-3">
              <DollarSign size={16} className="text-foreground/40 shrink-0" />
              <span>
                <span className="block text-sm font-medium text-foreground">Show estimated value</span>
                <span className="block text-xs text-foreground/50">
                  {isPublic ? 'Portfolio value and market range appear on your public profile.' : 'Only matters once your profile is public.'}
                </span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={showValuePublicly}
              onChange={(e) => setShowValuePublicly(e.target.checked)}
              disabled={!isPublic}
              className="w-5 h-5 accent-primary shrink-0"
            />
          </label>

          {isPublic && profileUrl && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-xs font-mono text-foreground/70 truncate">{profileUrl}</span>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-xs font-medium transition-colors"
              >
                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
            {profileMessage && (
              <span className={`text-xs ${profileMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{profileMessage.text}</span>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Privacy" description="Where things stand today, plainly." icon={Shield}>
        <p className="text-sm text-foreground/60 leading-relaxed">
          Your collection is private by default — nothing you track here is visible to anyone else unless you turn
          on a public profile above, and even then dollar amounts stay hidden unless you separately opt in.
        </p>
      </SettingsSection>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-center space-y-1">
      <Icon size={16} className="text-foreground/40 mx-auto" aria-hidden="true" />
      <p className="text-xl font-display font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-foreground/50 uppercase tracking-wide">{label}</p>
    </div>
  );
}
