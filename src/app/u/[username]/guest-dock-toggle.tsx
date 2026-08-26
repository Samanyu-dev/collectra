'use client';

import { useHideFloatingDock } from '@/components/layout/app-shell';

/** Hides the floating in-app dock only when this public profile is being viewed by a signed-out guest. */
export function GuestDockToggle({ hide }: { hide: boolean }) {
  useHideFloatingDock(hide);
  return null;
}
