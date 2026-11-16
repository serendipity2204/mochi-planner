// Runs after `npx cap add android`: icons, notification sounds, permissions, version.
// Usage: node scripts/patch-android.js [buildNumber]
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const app = path.join(root, 'android', 'app');
const res = path.join(app, 'src', 'main', 'res');
const build = parseInt(process.argv[2] || '1', 10) || 1;
const pkg = require(path.join(root, 'package.json'));
const [maj, min] = pkg.version.split('.');

if (!fs.existsSync(app)) { console.error('android/ not found – run `npx cap add android` first'); process.exit(1); }

// 1. Copy icons, monochrome status icon and notification sounds
function copyDir(src, dst) {
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); } else fs.copyFileSync(s, d);
  }
}
copyDir(path.join(root, 'android-res'), res);
// Use our PNG launcher icons instead of the default adaptive (Capacitor logo) icon
fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
for (const d of fs.readdirSync(res)) {
  if (d.startsWith('mipmap-')) fs.rmSync(path.join(res, d, 'ic_launcher_foreground.png'), { force: true });
}
console.log('✓ icons & sounds copied');

// 2. Permissions & queries in AndroidManifest.xml
const manifestPath = path.join(app, 'src', 'main', 'AndroidManifest.xml');
let mf = fs.readFileSync(manifestPath, 'utf8');
const perms = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.RECORD_AUDIO',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
];
for (const p of perms) {
  if (!mf.includes(`"${p}"`)) mf = mf.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
}
if (!mf.includes('android.speech.RecognitionService')) {
  mf = mf.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>\n</manifest>');
}
fs.writeFileSync(manifestPath, mf);
console.log('✓ manifest permissions');

// 3. Firebase: google-services.json, Google sign-in flag, minSdk 23
const gsSrc = path.join(root, 'firebase', 'google-services.json');
if (fs.existsSync(gsSrc)) {
  fs.copyFileSync(gsSrc, path.join(app, 'google-services.json'));
  const gs = JSON.parse(fs.readFileSync(gsSrc, 'utf8'));
  const hasWebClient = (gs.client || []).some((c) => (c.oauth_client || []).some((o) => o.client_type === 3));
  if (!hasWebClient) {
    // Placeholder so the Google sign-in plugin compiles; replaced automatically once the json contains the web client id
    const vals = path.join(res, 'values', 'mochi_placeholders.xml');
    fs.writeFileSync(vals, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="default_web_client_id" translatable="false">MISSING_WEB_CLIENT_ID</string>\n</resources>\n');
    console.log('! google-services.json has no web OAuth client – Google sign-in will be unavailable until it is updated');
  }
  console.log('✓ google-services.json');
}
const varsPath = path.join(root, 'android', 'variables.gradle');
if (fs.existsSync(varsPath)) {
  let v = fs.readFileSync(varsPath, 'utf8');
  v = v.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 23');
  if (!v.includes('rgcfaIncludeGoogle')) v = v.replace(/ext\s*\{/, 'ext {\n    rgcfaIncludeGoogle = true');
  fs.writeFileSync(varsPath, v);
  console.log('✓ variables.gradle (Google sign-in, minSdk 23)');
}

// 4. Version code / name
const gradlePath = path.join(app, 'build.gradle');
let g = fs.readFileSync(gradlePath, 'utf8');
g = g.replace(/versionCode\s+\d+/, `versionCode ${build}`).replace(/versionName\s+"[^"]*"/, `versionName "${maj}.${min}.${build}"`);
fs.writeFileSync(gradlePath, g);
console.log(`✓ version ${maj}.${min}.${build} (code ${build})`);
