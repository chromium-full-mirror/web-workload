import { average, measureStreamingRun, runColdAndWarm } from '../runner.js';

const EMOJI_PROMPT =
  `You are a Strict Analyst system. Your sole function is to execute sentiment analysis on product reviews with clinical precision. You must categorize the sentiment into exactly one of these five emoji markers: 😍 (Perfect), 🙂 (Very Good), 😐 (Good), 🙁 (Bad), or 😠 (Terrible).

ADHERENCE PROTOCOL:
1. You are strictly forbidden from providing any conversational filler, introductory text, or concluding remarks.
2. Your output must be a valid JSON object.
3. The JSON object must contain exactly two keys: "emoji" and "reason".
4. The "reason" field must contain a concise, clinical justification for the selection.

ONE-SHOT REFERENCE:
User Review: The delivery from Hakan’s Electronics took three weeks longer than promised, but the noise-canceling headphones actually work quite well once they arrived.
Output: {"emoji": "😐", "reason": "Severe logistical failure offset by satisfactory hardware performance resulting in a neutral median."}

Apply this protocol to the following data:


I have been shopping for my winter wardrobe since the late eighties when quality was a given and you didn't have to worry about whether a garment would survive a gentle breeze but when I ordered the Classic Elegance Cardigan from Hargreaves & Sons I truly thought I was investing in a heirloom piece that would sit nicely next to my vintage pashminas and silk scarves but honestly it has been a total catastrophy from the moment the delivery driver dropped it in a puddle near the gate and when I finally opened the plastic I realized the wool felt more like a dehydrated cactus than actual sheep fibers and it was so scratchy that I got a rash on my forearms within ten minutes of trying it on so I thought maybe a cold soak would soften the fibers but then it underwent a masive shrinkage and now it looks like something for a toddler or a porcelain doll which my husband Arthur says is just typical of how everything is made of cheap garbage these days and he started going on about the textile mills in Lancashire where his uncle worked back in the fifties where things actually lasted but this cardigan is just unexceptable because the buttones are already loose and the hem is fraying even though I haven't even worn it out of the house and the whole thing is just a smal mess now so then I tried to go onto their website to get a refund but their digital portal is a nightmare of buttons that don't click and I can't find my reciept because my Yahoo inbox has over four thousand unread messages from gardening newsletters and coupon sites and I can't find the QR code they keep mentioning in the automated emails so I am sitting here with a shrunken cactus sweater and no way to get my sixty-eight pounds back and it just makes me want to scream because the customer service bot keeps asking me if I've checked the FAQ but the FAQ doesn't explain why a luxury brand would sell such itchy rubbish and I still can't find that label to print out.

Honestly I have had better luck buying dish towels at the local market than shopping with Hargreaves & Sons because this garment is a total failyure and the sizing is way off even before it shrunk it was shaped like a box with no elegance whatsoever despite the name and I am just so tired of being let down by these fancy brands that spend more on their Instagram photos than on the actual stitching of the armpits which were also uneven by the way and now I have a headache from looking at my screen trying to find a return link that actually works but it’s just a loop of frustration and wasted money.`;

const PRODUCT_SUMMARY_PROMPT =
  `You are a professional product analyst. Your task is to provide an objective, comprehensive summary of the product based on customer reviews. Highlight key features, pros, cons, and the overall consensus. Output in structured markdown format with sections: Overview, Pros, Cons, and Verdict.

Summarize the following customer reviews for the 'ErgoFit Lumbar Office Chair':

Review 1: I've been using this chair for 3 months now. The lumbar support is adjustable and really helped my lower back pain. Assembly took about 20 minutes with clear instructions. The mesh back is breathable, which is great in the summer. Only minor gripe is the armrests feel slightly plasticky, but for this price point, it's hard to beat.

Review 2: Decent chair overall. Pros: very comfortable seat cushion (high density foam doesn't flatten), smooth roller wheels that don't scratch my hardwood floor, tilt lock works reliably. Cons: headrest doesn't tilt forward enough for shorter individuals (I'm 5'4"), and the packaging was banged up on arrival.

Review 3: Replaced my old gamer chair with the ErgoFit and my posture has improved dramatically. The pneumatic cylinder holds height without slipping. Breathable mesh keeps you cool during 8-hour coding sessions. Highly recommend for remote workers looking for ergonomic support under $300.

Review 4: Good build quality, sturdy metal base. The armrests are 3D adjustable (height, angle, forward/back) which works well with my standing desk converter. However, the recline tension knob is quite stiff to turn initially.

Review 5: Bought 5 of these for our small design studio. Team loves them. Clean aesthetic, solid ergonomics, easy maintenance. 5/5 stars.`;

const FLIGHT_BOOKING_PROMPT =
  `You are an AI travel assistant specializing in booking extraction and itinerary drafting. You analyze conversational travel requests and convert them into structured JSON itineraries while summarizing key traveler preferences, constraints, and follow-up recommendations.

Extract the travel itinerary details and preferences from this user conversation:

User: Hi! My partner and I are looking to take a trip from San Francisco (SFO) to Tokyo (either NRT or HND) for cherry blossom season next spring. We want to depart around March 28 and return around April 12. We prefer non-stop flights if possible, but a short layover in Los Angeles or Honolulu is acceptable if business class award space is available. We both have dietary restrictions: I am strictly gluten-free and my partner is vegetarian. Also, we'd like to spend 4 days in Tokyo, 3 days in Kyoto, 2 days in Kanazawa, and then head back to Tokyo for shopping in Ginza before flying home. Can you extract our travel requirements, flight preferences, hotel preferences, draft daily routing, and list any missing information or recommendations for booking high-demand ryokans during peak season?`;

const ARTICLE_SUMMARY_PROMPT =
  `Please analyze and summarize the following article in JSON format matching this schema:
{"type": "object", "properties": {"title": {"type": "string"}, "shortParagraph": {"type": "string"}, "bulletPoints": {"type": "array", "items": {"type": "string"}}, "rating": {"type": "number"}}, "required": ["title", "shortParagraph", "bulletPoints", "rating"]}
Article:
The cat (Felis catus), also called domestic cat and house cat, is a small domesticated carnivorous mammal. It is a member of Felidae, the family of mammals in the order Carnivora also colloquially referred to as cats. It is an obligate carnivore, requiring a predominantly meat-based diet. Its retractable claws are adapted to killing small prey species such as mice and rats. It has a strong, flexible body, quick reflexes, and sharp teeth, and its night vision and sense of smell are well developed. It is a social species, but a solitary hunter and a crepuscular predator. Cat communication includes meowing, purring, trilling, hissing, growling, grunting, body language, and scent marking. It can hear sounds too faint or too high in frequency for human ears, such as those made by small mammals. It secretes and perceives pheromones. Cat intelligence is evident in its ability to adapt, learn through observation, and solve problems. The domestic cat is the only domesticated species of the family Felidae. Advances in archaeology and genetics have shown that the domestication of the cat started in the Near East around 7500 BCE. Today, the domestic cat occurs across the globe and is valued by humans for companionship and its ability to kill vermin. It is commonly kept as a pet, working cat, and pedigreed cat shown at cat fancy events. Out of the estimated 600 million domestic cats worldwide, 400 million reside in Asia, including 58 million in China. About 73.8 million cats are estimated to live in the United States, and about 10.9 million cats in the United Kingdom. It also ranges freely as a feral cat, avoiding human contact. Pet abandonment contributes to increasing of the global feral cat population, which has driven the decline of bird, mammal, and reptile species. Population control includes spaying and neutering.`;

const TOOL_CALLING_PROMPT =
  'Hello, how are you? What is the current weather in San Francisco, CA in ' +
  'fahrenheit, and what is the current stock price of GOOG? Use the ' +
  'provided tools.';

// Drafter lookahead for speculative decoding (MTP): the number of tokens the
// drafter proposes per verification step. Must match Chrome's drafter config.
const MTP_GAMMA = 4;

// Shared create options. Frozen so stories can hand the same object to
// callers without copying it first. Object.freeze is shallow, which is
// sufficient here: callers only read or spread the top level.
const DEFAULT_CREATE_OPTIONS = Object.freeze({});
const MTP_CREATE_OPTIONS =
  Object.freeze({ samplingMode: 'most-predictable' });
const IMAGE_INPUTS =
  Object.freeze({ expectedInputs: [{ type: 'image' }] });
const AUDIO_INPUTS =
  Object.freeze({ expectedInputs: [{ type: 'audio' }] });
const TOOL_CALLING_CREATE_OPTIONS = Object.freeze({
  temperature: 0,
  topK: 1,
  expectedOutputs: [{ type: 'text' }, { type: 'tool-call' }],
  tools: [
    {
      name: 'get_weather',
      description: 'Get the current weather for a given city.',
      inputSchema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
          },
        },
        required: ['location'],
      },
    },
    {
      name: 'get_stock_price',
      description: 'Get the current stock price for a given ticker symbol.',
      inputSchema: {
        type: 'object',
        properties: {
          ticker: {
            type: 'string',
            description: 'The stock ticker symbol, e.g. GOOG',
          },
        },
        required: ['ticker'],
      },
    },
  ],
});

// Shared prompt options, passed to promptStreaming() the same way
// `createOptions` is passed to LanguageModel.create().
const DEFAULT_PROMPT_OPTIONS = Object.freeze({});
// Constrained decoding (`responseConstraint`) for ARTICLE_SUMMARY_PROMPT.
const CONSTRAINED_SUMMARY_PROMPT_OPTIONS = Object.freeze({
  responseConstraint: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A concise and engaging title for the summary.',
      },
      shortParagraph: {
        type: 'string',
        description:
          'A short paragraph summarizing the main points of the article.',
      },
      bulletPoints: {
        type: 'array',
        items: { type: 'string' },
        description: 'A list of 3-5 key takeaways from the article.',
      },
      rating: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description:
          'A rating of the article\'s quality or usefulness from 1 to 5.',
      },
    },
    required: ['title', 'shortParagraph', 'bulletPoints', 'rating'],
    // Ensures the model does not add any other fields.
    additionalProperties: false,
  },
});

// `getPrompt` stays lazy because some prompts depend on assets that are
// loaded after this table is defined.
const STORIES = Object.freeze({
  'language_model': createLanguageModelStory({
    name: 'Language Model (Text)',
    createOptions: DEFAULT_CREATE_OPTIONS,
    getPrompt: () => EMOJI_PROMPT,
  }),
  'tool_calling': createLanguageModelStory({
    name: 'Language Model (Tool Calling)',
    createOptions: TOOL_CALLING_CREATE_OPTIONS,
    getPrompt: () => TOOL_CALLING_PROMPT,
  }),
  'mtp_summary': createLanguageModelStory({
    name: 'MTP Product Summary (Long-form)',
    createOptions: MTP_CREATE_OPTIONS,
    getPrompt: () => PRODUCT_SUMMARY_PROMPT,
    recordAcceptanceRate: true,
  }),
  'mtp_flight': createLanguageModelStory({
    name: 'MTP Flight Booking (Structured)',
    createOptions: MTP_CREATE_OPTIONS,
    getPrompt: () => FLIGHT_BOOKING_PROMPT,
    recordAcceptanceRate: true,
  }),
  'mtp_emoji': createLanguageModelStory({
    name: 'MTP Emoji Reviews (Short / Regression)',
    createOptions: MTP_CREATE_OPTIONS,
    getPrompt: () => EMOJI_PROMPT,
    recordAcceptanceRate: true,
  }),
  'mtp_constrained_summary': createLanguageModelStory({
    name: 'MTP Article Summary (Constrained JSON)',
    createOptions: MTP_CREATE_OPTIONS,
    promptOptions: CONSTRAINED_SUMMARY_PROMPT_OPTIONS,
    getPrompt: () => ARTICLE_SUMMARY_PROMPT,
    recordAcceptanceRate: true,
  }),
  'multimodal_image': createLanguageModelStory({
    name: 'Multimodal (Image)',
    createOptions: IMAGE_INPUTS,
    getPrompt: () => [{
      role: 'user',
      content: [
        { type: 'text', value: 'Describe the image.' },
        {
          type: 'image',
          value: document.getElementById('input-image-apple'),
        },
      ],
    }],
  }),
  'multimodal_images': createLanguageModelStory({
    name: 'Multimodal (Multiple Images)',
    createOptions: IMAGE_INPUTS,
    getPrompt: () => [{
      role: 'user',
      content: [
        {
          type: 'text',
          value: 'Which of these images is not like the others?',
        },
        {
          type: 'image',
          value: document.getElementById('input-image-apple'),
        },
        {
          type: 'image',
          value: document.getElementById('input-image-orange'),
        },
        {
          type: 'image',
          value: document.getElementById('input-image-cat'),
        },
        {
          type: 'image',
          value: document.getElementById('input-image-strawberry'),
        },
      ],
    }],
  }),
  'multimodal_audio': createLanguageModelStory({
    name: 'Multimodal (Audio)',
    createOptions: AUDIO_INPUTS,
    getPrompt: async () => [{
      role: 'user',
      content: [
        { type: 'text', value: 'Transcribe this audio' },
        { type: 'audio', value: await getAudioBuffer() },
      ],
    }],
  }),
});

let cachedAudioBuffer;

async function getAudioBuffer() {
  if (!cachedAudioBuffer) {
    const audioEl = document.getElementById('input-audio-dream');
    const arrayBuffer = await (await fetch(audioEl.src)).arrayBuffer();
    const audioCtx = new AudioContext();
    try {
      cachedAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      await audioCtx.close();
    }
  }
  return cachedAudioBuffer;
}

// Output tokens for a constrained prompt. Chrome adds the response schema to
// the model input, but measureContextUsage() does not count it, so the
// contextUsage delta would over-count output tokens. Tokenize the response
// text instead, minus the fixed per-measurement overhead. The +1 matches the
// end-of-turn token included by the contextUsage-based count below, so
// constrained and unconstrained stories are counted the same way.
async function countResponseTokens(session, responseText) {
  const withText = await session.measureContextUsage(responseText);
  const overhead = await session.measureContextUsage('');
  return Math.max(0, withText - overhead + 1);
}

async function countChunkTokens(session, chunk) {
  if (!chunk) return 0;
  const input = typeof chunk === 'string' ?
    chunk :
    [{ role: 'assistant', content: [chunk] }];
  const withChunk = await session.measureContextUsage(input);
  const overhead = await session.measureContextUsage('');
  return Math.max(0, withChunk - overhead);
}

async function runLanguageModelIteration(storyDef, session, promptContent) {
  const promptOptions = storyDef.promptOptions ?? DEFAULT_PROMPT_OPTIONS;
  const initialUsage = session.contextUsage;
  const inputTokens = await session.measureContextUsage(promptContent);
  const streamRes = await measureStreamingRun(
    () => session.promptStreaming(promptContent, promptOptions));
  const tokens = promptOptions.responseConstraint ?
    await countResponseTokens(session, streamRes.responseText) :
    Math.max(0, session.contextUsage - initialUsage - inputTokens - 3);
  // Speculative decoding (MTP) acceptance rate.
  // Accounts for partial final chunk cut off by EOS using expected value:
  // A = (tokens - chunkCount) / (chunkCount - 0.5)
  // Emitted to window.metrics only for MTP stories to avoid noise and
  // dead series on non-MTP stories.
  const acceptanceRate = streamRes.chunkCount > 0 ?
    ((tokens - streamRes.chunkCount) / (streamRes.chunkCount - 0.5)) /
      MTP_GAMMA :
    0;

  const firstChunkTokens = storyDef.recordAcceptanceRate ?
    1 + acceptanceRate * MTP_GAMMA :
    await countChunkTokens(session, streamRes.firstChunk);
  // Exclude the first chunk's tokens to measure decode rate after the first
  // chunk arrives.
  const tokensPerSecond = streamRes.durationSec > 0 ?
    Math.max(0, tokens - firstChunkTokens) / streamRes.durationSec :
    0;

  return {
    timeToFirstTokenMs: streamRes.timeToFirstTokenMs,
    totalTimeMs: streamRes.totalTimeMs,
    tokensPerSecond,
    acceptanceRate,
    responseText: streamRes.responseText,
  };
}

function createLanguageModelStory(storyDef) {
  return Object.freeze({
    name: storyDef.name,
    createOptions: storyDef.createOptions,
    run: async () => {
      const promptContent = await storyDef.getPrompt();
      const { sessionCreationTimeMs, coldResult, warmResults } =
        await runColdAndWarm({
          storyName: storyDef.name,
          createSession: () => LanguageModel.create(storyDef.createOptions),
          runIteration: (session) =>
            runLanguageModelIteration(storyDef, session, promptContent),
        });

      const metrics = {
        sessionCreationTimeMs,
        coldTimeToFirstTokenMs: coldResult.timeToFirstTokenMs,
        coldTotalPromptTimeMs: coldResult.totalTimeMs,
        coldTokensPerSecond: coldResult.tokensPerSecond,
        warmTimeToFirstTokenMs: warmResults.map(r => r.timeToFirstTokenMs),
        warmTotalPromptTimeMs: warmResults.map(r => r.totalTimeMs),
        warmTokensPerSecond: warmResults.map(r => r.tokensPerSecond),
      };
      if (storyDef.recordAcceptanceRate) {
        metrics.coldAcceptanceRate = coldResult.acceptanceRate;
        metrics.warmAcceptanceRate = warmResults.map(r => r.acceptanceRate);
      }
      return metrics;
    },
  });
}

function createStoryCard(story, storyMetrics) {
  const template =
    document.getElementById('language-model-story-card-template');
  const card = template.content.cloneNode(true);
  const avgWarmTtft = average(storyMetrics.warmTimeToFirstTokenMs);
  const avgWarmTotal = average(storyMetrics.warmTotalPromptTimeMs);
  const avgWarmTps = average(storyMetrics.warmTokensPerSecond);

  card.querySelector('.story-name').textContent = story.name;
  card.querySelector('.story-badge').textContent =
    `${avgWarmTps.toFixed(2)} t/sec`;
  card.querySelector('.metric-session').textContent =
    `${Math.round(storyMetrics.sessionCreationTimeMs)} ms`;
  card.querySelector('.metric-ttft-cold').textContent =
    `${Math.round(storyMetrics.coldTimeToFirstTokenMs)} ms`;
  card.querySelector('.metric-ttft-warm').textContent =
    `${Math.round(avgWarmTtft)} ms`;
  card.querySelector('.metric-total-cold').textContent =
    `${Math.round(storyMetrics.coldTotalPromptTimeMs)} ms`;
  card.querySelector('.metric-total-warm').textContent =
    `${Math.round(avgWarmTotal)} ms`;
  card.querySelector('.metric-tps-warm').textContent =
    `${avgWarmTps.toFixed(2)} t/sec`;
  card.querySelector('.metric-sampling-mode').textContent =
    story.createOptions?.samplingMode ?? 'default';

  return card;
}

// The gauge shows warm tokens per second, averaged over stories.
function summarize(results) {
  const storyTps = Object.values(results).map(
    storyMetrics => average(storyMetrics.warmTokensPerSecond));
  return { value: average(storyTps).toFixed(2), label: 't/sec' };
}

export const API_CONFIG = Object.freeze({
  name: 'language_model',
  label: 'LanguageModel',
  // OnDeviceModelService keeps model weights in memory until the 10s idle
  // timeout expires after session.destroy(). APIs that release models
  // synchronously on destroy() without a service idle timer (e.g.
  // LanguageDetector running TFLite in the renderer) can set this to false.
  needsOffload: true,
  defaultStories: Object.freeze(['language_model']),
  stories: STORIES,
  isSupported: () => typeof LanguageModel !== 'undefined',
  availability: (options) => LanguageModel.availability(options),
  createSession: (options) => LanguageModel.create(options),
  createStoryCard,
  summarize,
});
