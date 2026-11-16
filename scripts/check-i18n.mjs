// Verifies every i18n key used in the code exists in both languages with matching {placeholders}.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'www', 'js');
const { DICT } = await import(path.join(root, 'lang.js'));
const files = [];
const walk = (d) => fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); });
walk(root);
const used = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.-]+)'[,)]/g)) used.add(m[1]);
  for (const m of src.matchAll(/'((?:asg\.tpl\d|exam\.auto\d|quick\.(?:course|asg|exam|todo|note|scan)|pig\.wardrobe|set\.backup|set\.help|set\.about|common\.settings|tasks\.todo))'/g)) used.add(m[1]);
}
const dyn = {
  'nav.': ['home','schedule','tasks','focus','me','stats','notes','search'], 'cal.': ['day','week','month'], 'tasks.': ['asg','exam','todo'],
  'status.': ['red','yellow','green'], 'filter.': ['active','done','all','allCourses'], 'focus.': ['focus','short','long'],
  'greet.': ['morning','afternoon','evening','night'], 'home.sec.': ['next','today','focus','assignments','exams','todos'],
  'set.': ['language','account','notifications','appearance','calendar','backup','privacy','friends','sound','help','about'],
  'set.mode.': ['light','dark','system'], 'color.': ['pink','peach','lavender','mint','sky'], 'sound.': ['chime','bell','bubble','piano','none'],
  'notif.cat.': ['class','assignment','exam','review','pomodoro','todo'], 'note.cat.': ['lecture','handout','brief','personal','other'],
  'help.area.': ['schedule','tasks','focus','notes','settings','other'], 'backup.kind.': ['auto','manual','before-import'],
  'stats.': ['day','week','month'], 'pri.': ['high','med','low'], 'ob.title': ['1','2','3'], 'ob.body': ['1','2','3'],
  'enc.': [...Array(16).keys()].map(String), 'wd.s': [...Array(7).keys()].map(String), 'wd.l': [...Array(7).keys()].map(String), 'mon.': [...Array(12).keys()].map(String),
  'voice.prompt.': ['course','assignment','exam','todo'], 'voice.example.': ['course','assignment','exam','todo'], 'doc.': ['privacy','terms'], 'about.': ['privacy','terms','licenses'],
  'acc.': ['none','bow','flower','glasses','scarf','headphones','partyhat','crown','gradcap'], 'expr.': ['happy','smile','wink','love','star','cool'],
  'cloud.state.': ['signedOut','loading','syncing','synced','error','offline'], 'cloud.': ['login','register'],
  'err.': ['fbInvalidEmail','fbWrongLogin','fbEmailInUse','fbWeakPassword','fbTooMany','offline','fbRecentLogin','cancelled','fbPopupBlocked','fbCredInUse','fbAlreadyLinked','fbProviderOff','fbDomain','fbUserMismatch','fbRules','fbGoogleConfig','fbGeneric','fbTooLarge','fbNotSignedIn','speechUnavailable','micDenied','speechFailed','ocrLoad','offlineOCR','ocrFailed','invalidBackup','notFound','saveFailed','generic'],
};
for (const [p, list] of Object.entries(dyn)) list.forEach((x) => used.add(p + x));
for (const g of ['schedule','ocr','voice','asg','exam','focus','backup','lang']) { used.add(`guide.${g}.q`); used.add(`guide.${g}.a`); }
for (const g of ['offline','notif','ocr','voice','data','update','lock']) { used.add(`faq.${g}.q`); used.add(`faq.${g}.a`); }
let bad = 0;
const ph = (s) => [...(s || '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const k of [...used].sort()) {
  for (const l of ['zh', 'en']) if (!(k in DICT[l])) { console.log(`MISSING ${l}: ${k}`); bad++; }
  if (k in DICT.zh && k in DICT.en && ph(DICT.zh[k]) !== ph(DICT.en[k])) { console.log(`PLACEHOLDER MISMATCH: ${k}`); bad++; }
}
for (const k of Object.keys(DICT.zh)) if (!(k in DICT.en)) { console.log('zh-only key', k); bad++; }
for (const k of Object.keys(DICT.en)) if (!(k in DICT.zh)) { console.log('en-only key', k); bad++; }
console.log(`${used.size} keys used, ${Object.keys(DICT.zh).length} zh / ${Object.keys(DICT.en).length} en, problems: ${bad}`);
process.exit(bad ? 1 : 0);
