// Pure scoring helpers for the blink-ai quality stories. Kept free of DOM and
// Prompt API dependencies so they can be unit tested outside the browser.

export const MMLU_CHOICES = Object.freeze(['A', 'B', 'C', 'D']);

export function mean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// --- MMLU ---

// Extracts the chosen letter from a model response. Handles responses
// constrained to a JSON string enum (`"B"`) as well as free-form text such as
// `B`, `(B)`, `B. Paris` or `The answer is B`. Returns null when no choice can
// be found.
export function parseMultipleChoice(response) {
  if (typeof response !== 'string') return null;
  let text = response.trim();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'string') text = parsed.trim();
  } catch {
    // Not JSON; fall through to free-form parsing.
  }
  const leading = /^\(?([ABCD])(?:[).:\s]|$)/.exec(text);
  if (leading) return leading[1];
  const stated = /answer(?: is)?\s*:?\s*\(?([ABCD])\b/i.exec(text);
  if (stated) return stated[1].toUpperCase();
  return null;
}

// --- VizWiz-VQA (standard VQA accuracy, as in the official EvalAI script) --

const VQA_PUNCTUATION = Object.freeze([
  ';', '/', '[', ']', '"', '{', '}', '(', ')', '=', '+', '\\', '_', '-', '>',
  '<', '@', '`', ',', '?', '!',
]);
const VQA_NUMBER_WORDS = Object.freeze({
  none: '0', zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
});
const VQA_ARTICLES = new Set(['a', 'an', 'the']);
const VQA_CONTRACTIONS = Object.freeze({
  aint: 'ain\'t', arent: 'aren\'t', cant: 'can\'t', couldve: 'could\'ve',
  couldnt: 'couldn\'t', didnt: 'didn\'t', doesnt: 'doesn\'t', dont: 'don\'t',
  hadnt: 'hadn\'t', hasnt: 'hasn\'t', havent: 'haven\'t', hed: 'he\'d',
  hes: 'he\'s', howd: 'how\'d', howll: 'how\'ll', hows: 'how\'s', im: 'i\'m',
  ive: 'i\'ve', isnt: 'isn\'t', itd: 'it\'d', itll: 'it\'ll',
  lets: 'let\'s', maam: 'ma\'am', mightve: 'might\'ve', mustve: 'must\'ve',
  mustnt: 'mustn\'t', shes: 'she\'s', shouldve: 'should\'ve',
  shouldnt: 'shouldn\'t', thats: 'that\'s', theres: 'there\'s',
  theyd: 'they\'d', theyll: 'they\'ll', theyre: 'they\'re',
  theyve: 'they\'ve', wasnt: 'wasn\'t', wed: 'we\'d', weve: 'we\'ve',
  werent: 'weren\'t', whats: 'what\'s', wheres: 'where\'s', whos: 'who\'s',
  wont: 'won\'t', wouldve: 'would\'ve', wouldnt: 'wouldn\'t',
  youd: 'you\'d', youll: 'you\'ll', youre: 'you\'re', youve: 'you\'ve',
});

function processVqaPunctuation(text) {
  const hasCommaNumber = /\d,\d/.test(text);
  let out = text;
  for (const p of VQA_PUNCTUATION) {
    if (text.includes(p + ' ') || text.includes(' ' + p) || hasCommaNumber) {
      out = out.split(p).join('');
    } else {
      out = out.split(p).join(' ');
    }
  }
  // Drop periods that are not decimal points.
  return out.replace(/\.(?!\d)/g, '');
}

function processVqaDigitsAndArticles(text) {
  const words = [];
  for (const raw of text.toLowerCase().split(/\s+/)) {
    if (!raw) continue;
    const word = VQA_NUMBER_WORDS[raw] ?? raw;
    if (!VQA_ARTICLES.has(word)) words.push(VQA_CONTRACTIONS[word] ?? word);
  }
  return words.join(' ');
}

export function normalizeVqaAnswer(answer) {
  const text = String(answer ?? '').replace(/[\n\t]/g, ' ').trim();
  return processVqaDigitsAndArticles(processVqaPunctuation(text));
}

// Reduces a free-form model response to a short answer: first line only, with
// common lead-ins and wrapping quotes removed.
export function extractShortAnswer(response) {
  const firstLine = String(response ?? '').trim().split('\n')[0] ?? '';
  return firstLine
    .replace(/^\s*(?:the\s+)?answer\s*(?:is)?\s*:?\s*/i, '')
    .replace(/^["'`*]+|["'`*]+$/g, '')
    .trim();
}

// VQA accuracy: min(1, #matching humans / 3), averaged over the 10
// leave-one-annotator-out subsets.
export function vqaAccuracy(prediction, answers) {
  const pred = normalizeVqaAnswer(prediction);
  const gts = answers.map(normalizeVqaAnswer);
  if (gts.length === 0) return 0;
  const accs = gts.map((_, i) => {
    const matches = gts.filter((gt, j) => j !== i && gt === pred).length;
    return Math.min(1, matches / 3);
  });
  return mean(accs);
}

// --- LibriSpeech (word error rate) ---

// Lowercases, folds Unicode, drops punctuation (keeping in-word apostrophes)
// and splits hyphenated words, so references and hypotheses are compared on
// words only. This is lighter than Whisper's EnglishTextNormalizer (no number,
// spelling or contraction normalization), so the WER is meant for tracking
// regressions between runs, not for comparing with published results.
export function normalizeTranscript(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, '\'')
    .replace(/[-\u2010-\u2015]/g, ' ')
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/(^|\s)'+|'+(?=\s|$)/g, '$1')
    .split(/\s+/)
    .filter(Boolean);
}

export function wordEditDistance(reference, hypothesis) {
  let prev = Array.from({ length: hypothesis.length + 1 }, (_, j) => j);
  for (let i = 1; i <= reference.length; i++) {
    const curr = [i];
    for (let j = 1; j <= hypothesis.length; j++) {
      const substitution =
        prev[j - 1] + (reference[i - 1] === hypothesis[j - 1] ? 0 : 1);
      curr.push(Math.min(substitution, prev[j] + 1, curr[j - 1] + 1));
    }
    prev = curr;
  }
  return prev[hypothesis.length];
}

// Returns the edit count and reference length for one utterance so callers
// can compute corpus-level WER as sum(errors) / sum(referenceWords).
export function transcriptErrors(reference, hypothesis) {
  const ref = normalizeTranscript(reference);
  const hyp = normalizeTranscript(hypothesis);
  return { errors: wordEditDistance(ref, hyp), referenceWords: ref.length };
}

export function corpusWordErrorRate(perUtterance) {
  const errors = perUtterance.reduce((a, u) => a + u.errors, 0);
  const words = perUtterance.reduce((a, u) => a + u.referenceWords, 0);
  return words > 0 ? errors / words : 0;
}
