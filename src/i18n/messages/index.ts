import { admin } from './admin';
import { alerts } from './alerts';
import { assets } from './assets';
import { assetTypes } from './asset-types';
import { auditlog } from './auditlog';
import { auth } from './auth';
import { common } from './common';
import { cves } from './cves';
import { dashboard } from './dashboard';
import { intel } from './intel';
import { demo } from './demo';
import { reports } from './reports';
import { shell } from './shell';
import { vulns } from './vulns';

export const MESSAGES = { ...common, ...shell, ...auth, ...cves, ...dashboard, ...admin, ...demo, ...assetTypes, ...alerts, ...intel, ...assets, ...vulns, ...reports, ...auditlog };
export type MessageKey = keyof typeof MESSAGES;
