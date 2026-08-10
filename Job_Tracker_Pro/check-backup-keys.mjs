/* Static consistency guard: every array field on AppState must be listed in
   loadBackup's KEYS, or a restored backup silently drops that collection.
   This is exactly how the STAR stories were being lost ('stories' vs
   'starStories'), so the check is asserted, not printed. */
import { readFileSync } from 'node:fs';

const types = readFileSync('src/types.ts', 'utf8');
const store = readFileSync('src/store.ts', 'utf8');

const stateBlock = types.match(/export interface AppState \{([\s\S]*?)\n\}/)[1];
const arrayFields = [...stateBlock.matchAll(/^ {2}(\w+):[^\n]*\[\];$/gm)].map(m => m[1]);

const keysBlock = store.match(/const KEYS = \[([\s\S]*?)\] as const;/)[1];
const keys = [...keysBlock.matchAll(/'([^']+)'/g)].map(m => m[1]);

const missing = arrayFields.filter(f => !keys.includes(f));
const bogus = keys.filter(k => !arrayFields.includes(k));

console.log(`AppState array fields (${arrayFields.length}): ${arrayFields.join(', ')}`);
console.log(`loadBackup KEYS      (${keys.length}): ${keys.join(', ')}`);
if (missing.length) console.log(`FAIL missing from KEYS: ${missing.join(', ')}`);
if (bogus.length) console.log(`FAIL KEYS name no field: ${bogus.join(', ')}`);
if (missing.length || bogus.length) process.exit(1);
console.log('PASS backup key coverage complete');
