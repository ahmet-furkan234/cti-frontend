'use client';

import { useEffect, useState } from 'react';
import { isLocalSession } from './local-auth';

/**
 * True while the app runs in the local preview session (sample data, no real backend login).
 * Starts false so server and first client render agree; flips after mount.
 */
export function useDemo(): boolean {
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isLocalSession()), []);
  return demo;
}
