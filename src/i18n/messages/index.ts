import { admin } from './admin';
import { auth } from './auth';
import { common } from './common';
import { cves } from './cves';
import { dashboard } from './dashboard';
import { demo } from './demo';
import { shell } from './shell';

export const MESSAGES = { ...common, ...shell, ...auth, ...cves, ...dashboard, ...admin, ...demo };
export type MessageKey = keyof typeof MESSAGES;
