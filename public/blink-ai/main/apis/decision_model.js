// Benchmark stories for the Decisions API (`DecisionModel`).
// Explainer: https://github.com/explainers-by-googlers/decisions-api
//
// Each story uses a schema and labeled inputs drawn from the explainer's use
// cases. It records latency for the JavaScript-level interactions a page
// performs (create, cold and warm decide, as-you-type decides with an
// AbortSignal, concurrent decides) and answer quality against the expected
// labels, so model or scoring regressions show up next to speed changes.
//
// The `budget` URL parameter sizes the workload: `full` (default) runs every
// labeled input, and `small` runs a balanced subset for backends that score
// every option on each decide, such as the language-model backend on CPU.

import { average, setProgress, updateUI } from '../runner.js';

const EN_TEXT_INPUTS = Object.freeze([{ type: 'text', languages: ['en'] }]);

// Workload size for each `budget` URL parameter value.
const BUDGETS = Object.freeze({
  full: Object.freeze({
    labeledCases: Infinity,
    typingSteps: 10,
    extraDrafts: Infinity,
    abortTrials: 3,
    feedItems: Infinity,
  }),
  small: Object.freeze({
    labeledCases: 4,
    typingSteps: 3,
    extraDrafts: 0,
    abortTrials: 1,
    feedItems: 6,
  }),
});

// Use case 2: Instant intent routing & command discovery.
const COMMAND_PALETTE_SCHEMA = Object.freeze({
  expectedInputs: EN_TEXT_INPUTS,
  questions: [{
    id: 'command',
    type: 'choice',
    prompt: 'Which document editor command best fulfills the user\'s request?',
    options: [
      { label: 'export_pdf',
        description: 'Download or save the document as a PDF' },
      { label: 'share_link',
        description: 'Invite collaborators or copy a sharing link' },
      { label: 'archive_doc',
        description: 'Move the document to trash or archive' },
      { label: 'rename_doc', description: 'Change the title of the document' },
      { label: 'print_doc', description: 'Print the document on paper' },
      { label: 'version_history',
        description: 'See or restore an earlier version of the document' },
      { label: 'word_count',
        description: 'Count the words or characters in the document' },
      { label: 'translate_doc',
        description: 'Translate the document into another language' },
    ],
  }],
});

const COMMAND_EXAMPLES = Object.freeze({
  share_link: [
    'let my coworkers view this file',
    'give Priya permission to edit',
    'copy a link I can paste in the team chat',
    'add the marketing team as commenters',
    'send this doc to Sam so he can review it',
    'make this viewable by anyone with the link',
  ],
  export_pdf: [
    'I need a pdf copy to email to my landlord',
    'save it as a PDF so I can attach it',
    'download this as a pdf file',
    'convert the doc to PDF for the client',
    'get a PDF version for my records',
    'export as pdf',
  ],
  archive_doc: [
    'get rid of this doc, I don\'t need it anymore',
    'delete this file',
    'move this to the trash',
    'archive this old draft',
    'clean up my drive by removing this document',
    'throw this away',
  ],
  rename_doc: [
    'change the title to Q3 planning notes',
    'rename this file to Budget 2027',
    'the name of this doc is wrong, fix it',
    'call this document Team offsite agenda',
    'update the doc title',
    'give this file a better name',
  ],
  print_doc: [
    'send this to the printer down the hall',
    'print two copies for the meeting',
    'I need a paper copy of this',
    'print it',
    'make a hard copy to hand out',
    'print page 3 only',
  ],
  version_history: [
    'go back to the version from before Monday\'s edits',
    'undo everything Alex changed yesterday',
    'show me older versions of this file',
    'restore the draft from last week',
    'who changed this paragraph and when?',
    'see the edit history',
  ],
  word_count: [
    'how long is my essay so far?',
    'how many words is this?',
    'am I under the 500 word limit?',
    'count the characters in this doc',
    'check the length of my report',
    'what is the word count',
  ],
  translate_doc: [
    'make a Spanish copy of this for the Madrid office',
    'translate this into French',
    'I need this in Japanese',
    'convert the text to German for our Berlin team',
    'can you put this in Portuguese?',
    'translate this document to Korean',
  ],
});

// Round-robin over commands, so a `small` budget still covers several.
const COMMAND_PALETTE_CASES = Object.freeze(roundRobin(
  Object.entries(COMMAND_EXAMPLES).map(([command, inputs]) =>
    inputs.map(input => ({ input, expected: { command } })))));

// Use case 1: Natural language to structured filters & semantic search.
const HOTEL_FILTER_SCHEMA = Object.freeze({
  expectedInputs: EN_TEXT_INPUTS,
  questions: [
    {
      id: 'pet_friendly',
      type: 'boolean',
      prompt: 'Does the traveler require pet-friendly accommodations?',
    },
    {
      id: 'property_type',
      type: 'choice',
      prompt: 'Which type of lodging is the traveler searching for?',
      options: [
        { label: 'hotel',
          description: 'Standard hotel, resort, or boutique inn' },
        { label: 'rental',
          description: 'Entire apartment, house, or cabin rental' },
        { label: 'hostel', description: 'Shared dormitory or budget hostel' },
        { label: 'any', description: 'No specific property type mentioned' },
      ],
    },
    {
      id: 'price_tier',
      type: 'score',
      prompt: 'Rate the traveler\'s target price tier from 1 (budget) to 4 ' +
        '(luxury).',
      options: [
        { label: '1', description: 'Budget or inexpensive stay' },
        { label: '2', description: 'Moderate or mid-range price' },
        { label: '3', description: 'Upscale or premium property' },
        { label: '4', description: 'Luxury or five-star resort' },
      ],
    },
  ],
});

// Only unambiguous answers are labeled. The first few cases cover every
// property type, so a `small` budget still exercises each question.
const HOTEL_FILTER_CASES = Object.freeze([
  { input: 'dog-friendly hotel downtown that won\'t break the bank',
    expected: { pet_friendly: 'true', property_type: 'hotel',
                price_tier: '1' } },
  { input: 'five-star luxury resort with a spa for our anniversary',
    expected: { pet_friendly: 'false', property_type: 'hotel',
                price_tier: '4' } },
  { input: 'cheapest hostel bed near the train station',
    expected: { pet_friendly: 'false', property_type: 'hostel',
                price_tier: '1' } },
  { input: 'a whole cabin in the mountains where we can bring our two cats',
    expected: { pet_friendly: 'true', property_type: 'rental' } },
  { input: 'mid-range apartment for a month-long work trip',
    expected: { pet_friendly: 'false', property_type: 'rental',
                price_tier: '2' } },
  { input: 'anywhere close to the convention center',
    expected: { property_type: 'any' } },
  { input: 'boutique hotel that welcomes pets, happy to splurge',
    expected: { pet_friendly: 'true', property_type: 'hotel' } },
  { input: 'shared dorm room, as cheap as possible',
    expected: { property_type: 'hostel', price_tier: '1' } },
  { input: 'beach house for the family, our golden retriever is coming too',
    expected: { pet_friendly: 'true', property_type: 'rental' } },
  { input: 'affordable motel off the highway for one night',
    expected: { pet_friendly: 'false', property_type: 'hotel',
                price_tier: '1' } },
  { input: 'penthouse suite at the most exclusive hotel in town',
    expected: { pet_friendly: 'false', property_type: 'hotel',
                price_tier: '4' } },
  { input: 'backpacker hostel with lockers and a social vibe',
    expected: { pet_friendly: 'false', property_type: 'hostel' } },
  { input: 'somewhere to stay in Lisbon next weekend',
    expected: { property_type: 'any' } },
  { input: 'pet friendly place to stay near the lake',
    expected: { pet_friendly: 'true', property_type: 'any' } },
  { input: 'quiet bed and breakfast inn in the countryside',
    expected: { pet_friendly: 'false', property_type: 'hotel' } },
  { input: 'luxury villa with a private pool for ten people',
    expected: { property_type: 'rental', price_tier: '4' } },
  { input: 'budget-friendly room, we are traveling with a puppy',
    expected: { pet_friendly: 'true', price_tier: '1' } },
  { input: 'business hotel near the airport at a moderate price',
    expected: { pet_friendly: 'false', property_type: 'hotel',
                price_tier: '2' } },
  { input: 'upscale serviced apartment in the city center',
    expected: { property_type: 'rental', price_tier: '3' } },
  { input: 'hostel private room, we have a small dog',
    expected: { pet_friendly: 'true', property_type: 'hostel' } },
  { input: 'romantic five-star hotel in Paris',
    expected: { property_type: 'hotel', price_tier: '4' } },
  { input: 'cheap place to crash for the night, anything works',
    expected: { property_type: 'any', price_tier: '1' } },
  { input: 'farmhouse rental where our dog can run around',
    expected: { pet_friendly: 'true', property_type: 'rental' } },
  { input: 'all-inclusive resort in Cancun, money is no object',
    expected: { property_type: 'hotel', price_tier: '4' } },
  { input: 'a mid-priced hotel near the stadium',
    expected: { property_type: 'hotel', price_tier: '2' } },
  { input: 'condo rental for spring break on a student budget',
    expected: { property_type: 'rental', price_tier: '1' } },
  { input: 'no pets, just a clean hotel room for a conference',
    expected: { pet_friendly: 'false', property_type: 'hotel' } },
  { input: 'premium hotel with mountain views that allows cats',
    expected: { pet_friendly: 'true', property_type: 'hotel',
                price_tier: '3' } },
  { input: 'treehouse rental for a weekend getaway',
    expected: { property_type: 'rental' } },
  { input: 'youth hostel in Amsterdam for a school trip',
    expected: { property_type: 'hostel', price_tier: '1' } },
  { input: 'reasonably priced inn close to the hiking trails',
    expected: { property_type: 'hotel', price_tier: '2' } },
  { input: 'cottage that accepts pets for a week in August',
    expected: { pet_friendly: 'true', property_type: 'rental' } },
  { input: 'flexible on lodging type, just need wifi and a desk',
    expected: { property_type: 'any' } },
  { input: 'the fanciest suite available, we are celebrating',
    expected: { price_tier: '4' } },
  { input: 'traveling with my service dog, need a hotel downtown',
    expected: { pet_friendly: 'true', property_type: 'hotel' } },
  { input: 'mid-range vacation apartment with a kitchen',
    expected: { property_type: 'rental', price_tier: '2' } },
  { input: 'top-tier hotel with butler service',
    expected: { property_type: 'hotel', price_tier: '4' } },
  { input: 'dorm bed for under twenty dollars a night',
    expected: { property_type: 'hostel', price_tier: '1' } },
  { input: 'we want a vacation home that lets us bring the cats',
    expected: { pet_friendly: 'true', property_type: 'rental' } },
  { input: 'economical hotel room for a solo traveler',
    expected: { pet_friendly: 'false', property_type: 'hotel',
                price_tier: '1' } },
]);

// Use case 3: Real-time writing feedback & pre-submission checks.
const DRAFT_CHECK_SCHEMA = Object.freeze({
  expectedInputs: EN_TEXT_INPUTS,
  questions: [
    {
      id: 'has_repro_steps',
      type: 'boolean',
      prompt: 'Does this bug report include steps to reproduce the issue?',
    },
    {
      id: 'contains_pii',
      type: 'boolean',
      prompt: 'Does this bug report contain personal contact info, API ' +
        'keys, or passwords?',
    },
    {
      id: 'severity',
      type: 'score',
      prompt: 'Rate the severity of the reported bug from 1 (cosmetic) to 5 ' +
        '(critical).',
      options: [
        { label: '1', description: 'Cosmetic issue that breaks nothing' },
        { label: '2', description: 'Minor problem with an easy workaround' },
        { label: '3', description: 'Broken feature that has a workaround' },
        { label: '4', description: 'Broken feature with no workaround' },
        { label: '5', description: 'Crash, data loss, or security risk' },
      ],
    },
  ],
});

// The draft typed out word by word in the as-you-type measurements.
const BUG_REPORT_DRAFT =
  'Export to PDF crashes on large documents. When I try to export my ' +
  '40-page report to PDF the app freezes for a few seconds and then the tab ' +
  'crashes. Steps to reproduce: 1. Open any document longer than 30 pages. ' +
  '2. Click File, then Download, then PDF. 3. Wait about ten seconds. ' +
  'Expected: a PDF downloads. Actual: the tab shows "Aw, Snap!" and all ' +
  'unsaved changes are lost. This started after last week\'s update. You ' +
  'can reach me at jordan.lee@example.com, and our API key is ' +
  'sk-live-4f9a8b7c6d5e4f3a2b1c if you need to check the server logs. ' +
  'Browser: Chrome on Windows 11.';
const BUG_REPORT_EXPECTED =
  Object.freeze({ has_repro_steps: 'true', contains_pii: 'true' });

// More finished drafts, checked once each for answer quality.
const DRAFT_CASES = Object.freeze([
  { input: 'The settings page logo is slightly blurry on high-DPI screens. ' +
      'Everything else looks fine.',
    expected: { has_repro_steps: 'false', contains_pii: 'false' } },
  { input: 'Login fails with error 500. Steps: 1. Go to the sign-in page. ' +
      '2. Enter any valid account. 3. Click Sign in. The page shows ' +
      '"Internal error". My password is Hunter2!, feel free to try it.',
    expected: { has_repro_steps: 'true', contains_pii: 'true' } },
  { input: 'Search results sometimes show duplicates. Not sure how to ' +
      'trigger it, it just happens now and then.',
    expected: { has_repro_steps: 'false', contains_pii: 'false' } },
  { input: 'Dark mode toggle does nothing. To reproduce: open Settings, ' +
      'click Appearance, switch Dark mode on, and reload the page. ' +
      'Expected a dark theme, got the light theme.',
    expected: { has_repro_steps: 'true', contains_pii: 'false' } },
  { input: 'The app crashed while I was uploading photos. Call me at ' +
      '(555) 123-4567 if you need more details.',
    expected: { has_repro_steps: 'false', contains_pii: 'true' } },
  { input: 'Checkout total is wrong when a coupon is applied. Repro: add ' +
      'two items to the cart, apply code SAVE10, and go to checkout; the ' +
      'discount is applied twice.',
    expected: { has_repro_steps: 'true', contains_pii: 'false' } },
  { input: 'Notifications stopped arriving after the last update. My ' +
      'account email is maria.gomez@example.org.',
    expected: { has_repro_steps: 'false', contains_pii: 'true' } },
  { input: 'Video playback stutters. 1) Open any 4K video. 2) Switch to ' +
      'fullscreen. 3) Seek forward 30 seconds. Playback freezes for about ' +
      'two seconds. Our staging token is ghp_9f8e7d6c5b4a3210 in case you ' +
      'need it.',
    expected: { has_repro_steps: 'true', contains_pii: 'true' } },
]);

const KEYSTROKE_INTERVAL_MS = 50;

// Feed ranking: one score question over many inputs (the explainer's open
// `decideBatch()` question).
const FEED_RANKING_SCHEMA = Object.freeze({
  expectedInputs: EN_TEXT_INPUTS,
  questions: [{
    id: 'relevance',
    type: 'score',
    prompt: 'Rate how relevant this headline is to a reader who loves home ' +
      'gardening and cooking, from 1 (irrelevant) to 5 (must read).',
    options: [
      { label: '1', description: 'Irrelevant to gardening or cooking' },
      { label: '2', description: 'Only loosely related' },
      { label: '3', description: 'Somewhat relevant' },
      { label: '4', description: 'Clearly relevant' },
      { label: '5', description: 'A must read for a home gardener and cook' },
    ],
  }],
});

const RELEVANT_HEADLINES = Object.freeze([
  '10 tomato varieties that thrive on small balconies',
  'How to start a sourdough starter from scratch',
  'Composting 101: turning kitchen scraps into garden gold',
  'Five weeknight pasta recipes using fresh garden herbs',
  'When to plant garlic for a summer harvest',
  'The best cast-iron skillets for home cooks, tested',
  'Grow your own salad greens indoors all winter',
  'A beginner\'s guide to pickling cucumbers',
  'Raised bed or in-ground? Planning your vegetable patch',
  'Ten ways to use up a glut of zucchini',
  'Pruning roses: a step-by-step guide for spring',
  'Homemade pizza dough that rivals your favorite pizzeria',
  'Attract pollinators with these native flowering plants',
  'Slow-cooker soups made with backyard vegetables',
  'How to save seeds from this year\'s heirloom peppers',
  'Knife skills every home cook should master',
  'Keep slugs off your lettuce without chemicals',
  'Baking bread with whole grains: tips from a master baker',
  'Herb garden ideas for a sunny kitchen windowsill',
  'Make strawberry jam with fruit from your own patch',
]);

const IRRELEVANT_HEADLINES = Object.freeze([
  'Quarterly earnings: chipmaker beats analyst estimates',
  'Local team clinches playoff spot in overtime thriller',
  'New smartphone update adds a battery-saving mode',
  'City council approves downtown parking garage',
  'Ranking every superhero movie of the decade',
  'Mortgage rates dip for the third straight week',
  'Electric pickup truck review: range and towing tested',
  'Central bank signals pause in interest rate hikes',
  'Star striker transfers to rival club in record deal',
  'How to speed up your home wifi network',
  'Airline adds nonstop routes to three European cities',
  'Cryptocurrency prices swing after regulatory news',
  'Streaming service raises subscription prices again',
  'Marathon runner breaks course record in the heat',
  'Lawmakers debate new data privacy legislation',
  'Video game sequel tops the holiday sales charts',
  'Rocket launch delayed by high winds',
  'Tips for negotiating a higher salary',
  'Celebrity couple announces engagement',
  'Stock market closes higher on tech rally',
]);

// Alternates relevant and irrelevant items, so a `small` budget stays
// balanced.
const FEED_ITEMS = Object.freeze(roundRobin([
  RELEVANT_HEADLINES.map(input => ({ input, relevant: true })),
  IRRELEVANT_HEADLINES.map(input => ({ input, relevant: false })),
]));

// --- Helpers ---

function getBudget() {
  const name =
    new URLSearchParams(window.location.search).get('budget') ?? 'full';
  if (!Object.hasOwn(BUDGETS, name)) {
    throw new Error(`Unknown budget "${name}", expected one of: ` +
                    Object.keys(BUDGETS).join(', '));
  }
  return BUDGETS[name];
}

// Interleaves `lists` item by item.
function roundRobin(lists) {
  const result = [];
  for (let i = 0; lists.some(list => i < list.length); i++) {
    for (const list of lists) {
      if (i < list.length) {
        result.push(list[i]);
      }
    }
  }
  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function timed(fn) {
  const start = performance.now();
  const result = await fn();
  return [performance.now() - start, result];
}

function tallyLabels(result, expected, tally) {
  for (const [id, label] of Object.entries(expected)) {
    tally.total++;
    if (result[id]?.label === label) {
      tally.correct++;
    }
  }
}

function accuracyOf(tally) {
  return tally.total ? tally.correct / tally.total : 0;
}

function confidencesOf(result) {
  return Object.values(result).map(decision => decision.confidence);
}

// Prefixes of `text` cut at word boundaries, as a user types it.
function typingPrefixes(text, steps) {
  const words = text.split(' ');
  return Array.from({ length: steps }, (_, i) => words
    .slice(0, Math.max(1, Math.round((words.length * (i + 1)) / steps)))
    .join(' '));
}

// Fraction of (relevant, irrelevant) item pairs that `scores` rank in the
// right order; ties count as half. This equals the area under the ROC curve
// (AUC) of `scores` as a relevance classifier: 1 is a perfect ranking, and 0.5
// is no better than chance.
function rankingPairAccuracy(items, scores) {
  let ordered = 0;
  let pairs = 0;
  items.forEach((a, i) => items.forEach((b, j) => {
    if (a.relevant && !b.relevant) {
      pairs++;
      ordered +=
        scores[i] > scores[j] ? 1 : scores[i] === scores[j] ? 0.5 : 0;
    }
  }));
  return pairs ? ordered / pairs : 0;
}

function status(message, done, total) {
  updateUI('running', message, `${done}/${total}`, 'Deciding');
  setProgress((done / total) * 100);
}

// --- Stories ---

// A Decisions API story: the schema passed to DecisionModel.create() and the
// page interactions measured against it. Subclasses implement run(), which
// reports the session's first decide() as `coldDecideMs` and the sequential
// decides after it as `warmDecideMs`.
class DecisionModelStory {
  constructor(name, createOptions) {
    this.name = name;
    this.createOptions = createOptions;
  }

  async run() {
    throw new Error(`${this.constructor.name} must implement run()`);
  }

  // Resolves to [creation time in ms, session].
  createSession() {
    return timed(() => DecisionModel.create(this.createOptions));
  }
}

// Decides every labeled input (the first decide is cold), then re-creates the
// session while the model is still loaded.
class LabeledCorpusStory extends DecisionModelStory {
  constructor(name, createOptions, cases) {
    super(name, createOptions);
    this.cases = cases;
  }

  async run() {
    const cases = this.cases.slice(0, getBudget().labeledCases);
    const [sessionCreationTimeMs, session] = await this.createSession();
    const tally = { correct: 0, total: 0 };
    const confidences = [];
    const warmDecideMs = [];
    let coldDecideMs = 0;
    try {
      for (const [i, { input, expected }] of cases.entries()) {
        status(`${this.name}: decide ${i + 1}`, i, cases.length);
        const [ms, result] = await timed(() => session.decide(input));
        if (i === 0) {
          coldDecideMs = ms;
        } else {
          warmDecideMs.push(ms);
        }
        tallyLabels(result, expected, tally);
        confidences.push(...confidencesOf(result));
        console.log(`[${this.name}] "${input}" ->`, JSON.stringify(result));
      }
    } finally {
      session.destroy();
    }
    const [warmSessionCreationTimeMs, warmSession] = await this.createSession();
    warmSession.destroy();
    return {
      sessionCreationTimeMs,
      warmSessionCreationTimeMs,
      coldDecideMs,
      warmDecideMs,
      accuracy: accuracyOf(tally),
      meanConfidence: average(confidences),
    };
  }
}

// As-you-type checks on `draft`: decides on growing prefixes, more finished
// drafts for answer quality, an undebounced keystroke burst that aborts each
// stale decide, and decides issued right after an abort.
class DraftTypingStory extends DecisionModelStory {
  constructor(name, createOptions, { draft, expected, cases }) {
    super(name, createOptions);
    this.draft = draft;
    this.expected = expected;
    this.cases = cases;
  }

  async run() {
    const budget = getBudget();
    const [sessionCreationTimeMs, session] = await this.createSession();
    try {
      const prefixes = typingPrefixes(this.draft, budget.typingSteps);
      const warmDecideMs = [];
      let coldDecideMs = 0;
      let finalResult;
      for (const [i, prefix] of prefixes.entries()) {
        status(`${this.name}: prefix ${i + 1}`, i, prefixes.length);
        const [ms, result] = await timed(() => session.decide(prefix));
        if (i === 0) {
          coldDecideMs = ms;
        } else {
          warmDecideMs.push(ms);
        }
        finalResult = result;
      }
      console.log(`[${this.name}] final ->`, JSON.stringify(finalResult));
      const tally = { correct: 0, total: 0 };
      tallyLabels(finalResult, this.expected, tally);
      const confidences = confidencesOf(finalResult);

      const drafts = this.cases.slice(0, budget.extraDrafts);
      for (const [i, { input, expected }] of drafts.entries()) {
        status(`${this.name}: draft ${i + 1}`, i, drafts.length);
        const result = await session.decide(input);
        tallyLabels(result, expected, tally);
        confidences.push(...confidencesOf(result));
        console.log(`[${this.name}] "${input}" ->`, JSON.stringify(result));
      }

      const finalResultLatencyMs =
        await this.measureKeystrokeBurst(session, prefixes);
      const decideAfterAbortMs =
        await this.measureDecideAfterAbort(session, budget.abortTrials);
      return {
        sessionCreationTimeMs,
        coldDecideMs,
        warmDecideMs,
        fullDraftDecideMs: warmDecideMs.at(-1),
        finalResultLatencyMs,
        decideAfterAbortMs,
        accuracy: accuracyOf(tally),
        meanConfidence: average(confidences),
      };
    } finally {
      session.destroy();
    }
  }

  // Undebounced typing: a decide per keystroke that aborts the stale one.
  // Returns how long the last decide takes to resolve after the last
  // keystroke.
  async measureKeystrokeBurst(session, prefixes) {
    status(`${this.name}: keystroke burst`, 0, 1);
    let controller;
    let latest;
    let lastKeystroke;
    for (const prefix of prefixes) {
      if (controller) {
        await sleep(KEYSTROKE_INTERVAL_MS);
        controller.abort();
      }
      controller = new AbortController();
      lastKeystroke = performance.now();
      latest = session.decide(prefix, { signal: controller.signal });
      latest.catch(() => {});
    }
    await latest;
    return performance.now() - lastKeystroke;
  }

  // Times a decide issued right after aborting an in-flight one, which shows
  // whether abort frees the backend.
  async measureDecideAfterAbort(session, trials) {
    const decideAfterAbortMs = [];
    for (let i = 0; i < trials; i++) {
      status(`${this.name}: abort trial ${i + 1}`, i, trials);
      const stale = new AbortController();
      session.decide(this.draft, { signal: stale.signal }).catch(() => {});
      await sleep(KEYSTROKE_INTERVAL_MS);
      stale.abort();
      const [ms] = await timed(() => session.decide(this.draft));
      decideAfterAbortMs.push(ms);
    }
    return decideAfterAbortMs;
  }
}

// Scores every item with the schema's score question, sequentially and then
// all at once with Promise.all().
class FeedRankingStory extends DecisionModelStory {
  constructor(name, createOptions, items) {
    super(name, createOptions);
    this.items = items;
    this.questionId = createOptions.questions[0].id;
  }

  async run() {
    const items = this.items.slice(0, getBudget().feedItems);
    const [sessionCreationTimeMs, session] = await this.createSession();
    try {
      const warmDecideMs = [];
      let coldDecideMs = 0;
      const scores = [];
      const sequentialStart = performance.now();
      for (const [i, { input }] of items.entries()) {
        status(`${this.name}: item ${i + 1}`, i, items.length);
        const [ms, result] = await timed(() => session.decide(input));
        if (i === 0) {
          coldDecideMs = ms;
        } else {
          warmDecideMs.push(ms);
        }
        // `score` was `expectedScore` before https://crrev.com/c/8788005. The
        // ranking only uses the order of the scores.
        const decision = result[this.questionId];
        scores.push(decision.score ?? decision.expectedScore);
      }
      const sequentialTotalMs = performance.now() - sequentialStart;
      console.log(`[${this.name}] scores:`, JSON.stringify(scores));

      status(`${this.name}: concurrent`, 0, 1);
      const [concurrentTotalMs] = await timed(
        () => Promise.all(items.map(({ input }) => session.decide(input))));
      return {
        sessionCreationTimeMs,
        coldDecideMs,
        warmDecideMs,
        sequentialTotalMs,
        concurrentTotalMs,
        rankingPairAccuracy: rankingPairAccuracy(items, scores),
      };
    } finally {
      session.destroy();
    }
  }
}

const STORIES = Object.freeze({
  'intent_routing': new LabeledCorpusStory(
    'Intent Routing (Command Palette)', COMMAND_PALETTE_SCHEMA,
    COMMAND_PALETTE_CASES),
  'search_filters': new LabeledCorpusStory(
    'Search Filters (Boolean + Choice + Score)', HOTEL_FILTER_SCHEMA,
    HOTEL_FILTER_CASES),
  'draft_typing': new DraftTypingStory(
    'Draft Check As You Type (AbortSignal)', DRAFT_CHECK_SCHEMA, {
      draft: BUG_REPORT_DRAFT,
      expected: BUG_REPORT_EXPECTED,
      cases: DRAFT_CASES,
    }),
  'feed_ranking': new FeedRankingStory(
    'Feed Ranking (Sequential vs Concurrent)', FEED_RANKING_SCHEMA,
    FEED_ITEMS),
});

// --- Results ---

// Formats a metric for its result card row: latencies (`*Ms`) in whole
// milliseconds and scores to two decimals. Arrays show their average.
function formatMetric(key, value) {
  const shown = Array.isArray(value) ? average(value) : value;
  return key.endsWith('Ms') ? `${Math.round(shown)} ms` : shown.toFixed(2);
}

function createStoryCard(story, storyMetrics) {
  const template =
    document.getElementById('decision-model-story-card-template');
  const card = template.content.cloneNode(true);
  card.querySelector('.story-name').textContent = story.name;
  card.querySelector('.story-badge').textContent =
    `${average(storyMetrics.warmDecideMs).toFixed(1)} ms/decide`;
  for (const row of card.querySelectorAll('[data-metric]')) {
    const value = storyMetrics[row.dataset.metric];
    if (value === undefined) {
      row.remove();
      continue;
    }
    row.querySelector('.result-value').textContent =
      formatMetric(row.dataset.metric, value);
  }
  return card;
}

// The gauge shows warm decide() latency, averaged over every story's warm
// decides.
function summarize(results) {
  const decides = Object.values(results).flatMap(
    storyMetrics => storyMetrics.warmDecideMs);
  return { value: average(decides).toFixed(1), label: 'ms/decide' };
}

export const API_CONFIG = Object.freeze({
  name: 'decision_model',
  label: 'DecisionModel',
  // Backends keep their model loaded until the on-device model idle timeout;
  // wait it out between stories so that each story's create() is cold.
  needsOffload: true,
  defaultStories: Object.freeze(Object.keys(STORIES)),
  stories: STORIES,
  isSupported: () => typeof DecisionModel !== 'undefined',
  availability: (options) => DecisionModel.availability(options),
  createSession: (options) => DecisionModel.create(options),
  createStoryCard,
  summarize,
});
