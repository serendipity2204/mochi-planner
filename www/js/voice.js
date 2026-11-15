// Voice capture → parse → prefilled form. Falls back to typed sentence when speech isn't available.
import { t, lang } from './i18n.js';
import { listen, speechSupported } from './native.js';
import { promptDialog, toast, errMsg } from './ui.js';
import { parseCourse, parseAssignment, parseExam, parseTodo } from './parse.js';

const PARSERS = { course: parseCourse, assignment: parseAssignment, exam: parseExam, todo: parseTodo };

export async function captureSentence(kind) {
  let text = '';
  if (speechSupported()) {
    toast(t('voice.listening'));
    try { text = await listen(lang(), t('voice.prompt.' + kind)); }
    catch (e) { toast(errMsg(e), 'err'); }
  }
  if (!text) text = await promptDialog(t(speechSupported() ? 'voice.typeInstead' : 'voice.notSupported'), '', t('voice.example.' + kind));
  return text || '';
}

// Returns parsed object (with _heard) or null
export async function voiceParse(kind) {
  const text = await captureSentence(kind);
  if (!text) return null;
  const parsed = PARSERS[kind](text);
  parsed._heard = text;
  return parsed;
}
