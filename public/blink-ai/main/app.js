(() => {
  const gaugeFill = document.getElementById('gauge-fill');
  const gaugeValue = document.getElementById('gauge-value');
  const gaugeLabel = document.getElementById('gauge-label');
  const startBtn = document.getElementById('start-button');
  const statusText = document.getElementById('status-text');
  const statusSpinner = document.getElementById('status-spinner');
  const resultsPanel = document.getElementById('results-panel');

  const resDownload = document.getElementById('res-download');
  const storyResults = document.getElementById('story-results');

  const img1 = document.getElementById('input-image-apple');
  const img2 = document.getElementById('input-image-orange');
  const img3 = document.getElementById('input-image-cat');
  const img4 = document.getElementById('input-image-strawberry');

  let cachedAudioBuffer;
  startBtn.disabled = true;

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

  const R = 100;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  const WARM_RUNS = 5;

  // Drafter lookahead for speculative decoding (MTP): the number of tokens the
  // drafter proposes per verification step. Must match Chrome's drafter config.
  const MTP_GAMMA = 4;

  // Shared create options. Frozen so stories can hand the same object to
  // callers without copying it first. Object.freeze is shallow, which is
  // sufficient here: callers only read or spread the top level.
  const DEFAULT_CREATE_OPTIONS = Object.freeze({});
  const MTP_CREATE_OPTIONS =
    Object.freeze({ samplingMode: 'most-predictable' });
  const IMAGE_INPUTS = Object.freeze({ expectedInputs: [{ type: 'image' }] });
  const AUDIO_INPUTS = Object.freeze({ expectedInputs: [{ type: 'audio' }] });

  // `getPrompt` stays lazy because some prompts depend on assets that are
  // loaded after this table is defined.
  const STORIES = {
    'language_model': {
      name: 'Language Model (Text)',
      createOptions: DEFAULT_CREATE_OPTIONS,
      getPrompt: () => EMOJI_PROMPT
    },
    'mtp_summary': {
      name: 'MTP Product Summary (Long-form)',
      createOptions: MTP_CREATE_OPTIONS,
      getPrompt: () => PRODUCT_SUMMARY_PROMPT
    },
    'mtp_flight': {
      name: 'MTP Flight Booking (Structured)',
      createOptions: MTP_CREATE_OPTIONS,
      getPrompt: () => FLIGHT_BOOKING_PROMPT
    },
    'mtp_emoji': {
      name: 'MTP Emoji Reviews (Short / Regression)',
      createOptions: MTP_CREATE_OPTIONS,
      getPrompt: () => EMOJI_PROMPT
    },
    'multimodal_image': {
      name: 'Multimodal (Image)',
      createOptions: IMAGE_INPUTS,
      getPrompt: () => [{
        role: 'user',
        content: [
          { type: 'text', value: 'Describe the image.' },
          { type: 'image', value: img1 }
        ]
      }]
    },
    'multimodal_images': {
      name: 'Multimodal (Multiple Images)',
      createOptions: IMAGE_INPUTS,
      getPrompt: () => [{
        role: 'user',
        content: [
          {
            type: 'text',
            value: 'Which of these images is not like the others?'
          },
          { type: 'image', value: img1 }, { type: 'image', value: img2 },
          { type: 'image', value: img3 }, { type: 'image', value: img4 }
        ]
      }]
    },
    'multimodal_audio': {
      name: 'Multimodal (Audio)',
      createOptions: AUDIO_INPUTS,
      getPrompt: () => {
        if (!cachedAudioBuffer) {
          throw new Error('Audio asset was not preloaded.');
        }
        return [{
          role: 'user',
          content: [
            { type: 'text', value: 'Transcribe this audio' },
            { type: 'audio', value: cachedAudioBuffer }
          ]
        }];
      }
    }
  };

  function setProgress(percent) {
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    if (gaugeFill) gaugeFill.style.strokeDashoffset = offset;
  }

  function updateUI(state, message, val, label) {
    if (statusText) {
      statusText.className = 'status-text ' + state;
      statusText.textContent = message;
    }
    if (gaugeValue) gaugeValue.textContent = val;
    if (gaugeLabel) gaugeLabel.textContent = label;
    if (statusSpinner) {
      statusSpinner.style.display = state === 'running' ? 'block' : 'none';
    }
  }

  async function runPromptStream(session, promptContent) {
    const initialUsage = session.contextUsage;
    const inputTokens = await session.measureContextUsage(promptContent);
    const startTime = performance.now();
    const stream = session.promptStreaming(promptContent);
    let firstTokenTime;
    let timeToFirstTokenMs = 0;
    let responseText = '';
    let chunkCount = 0;

    for await (const chunk of stream) {
      chunkCount++;
      if (!firstTokenTime) {
        firstTokenTime = performance.now();
        timeToFirstTokenMs = firstTokenTime - startTime;
      }
      responseText += chunk;
    }

    const totalTimeMs = performance.now() - startTime;
    const durationSec = (performance.now() - firstTokenTime) / 1000;
    const tokens = Math.max(0, session.contextUsage - initialUsage - inputTokens - 3);
    // Exclude the first token to measure decode rate after TTFT.
    const tokensPerSecond =
      durationSec > 0 ? Math.max(0, tokens - 1) / durationSec : 0;

    // Speculative decoding (MTP) acceptance rate.
    // Accounts for partial final chunk cut off by EOS using expected value:
    // A = (tokens - chunkCount) / (chunkCount - 0.5)
    // Reported for every story, not just MTP ones: without speculation each
    // chunk carries a single token, so this correctly reads ~0 and stays
    // comparable across A/B arms once MTP is enabled by default.
    const acceptanceRate = chunkCount > 0 ?
      ((tokens - chunkCount) / (chunkCount - 0.5)) / MTP_GAMMA : 0;

    return {
      timeToFirstTokenMs,
      totalTimeMs,
      acceptanceRate,
      tokens,
      tokensPerSecond,
      responseText,
    };
  }

  async function offloadModel() {
    console.log('Sleeping 90s to allow model offloading...');
    updateUI('running', 'Waiting for model offload (90s)...', '--', 'Waiting');
    await new Promise(resolve => setTimeout(resolve, 90000));
  }

  async function runStory(story) {
    console.log(`Running story: ${story.name}`);
    updateUI('running', `Initializing ${story.name}...`, '--', 'Loading');
    setProgress(0);

    const storyMetrics = {};

    try {
      const startCreate = performance.now();
      let session = await LanguageModel.create(story.createOptions);
      const endCreate = performance.now();
      setProgress(100);

      storyMetrics.sessionCreationTimeMs = endCreate - startCreate;

      // 2. Cold Run
      try {
        updateUI('running', 'Executing cold prompt...', '--', 'Running');
        const coldRes = await runPromptStream(session, story.getPrompt());
        storyMetrics.coldTimeToFirstTokenMs = coldRes.timeToFirstTokenMs;
        storyMetrics.coldTotalPromptTimeMs = coldRes.totalTimeMs;
        storyMetrics.coldAcceptanceRate = coldRes.acceptanceRate;
        storyMetrics.coldTokensPerSecond = coldRes.tokensPerSecond;

        console.log(
          `[Cold Run Output for ${story.name}]: ${coldRes.responseText}`);
      } finally {
        session.destroy();
      }

      // 3. Warm Runs
      storyMetrics.warmTimeToFirstTokenMs = [];
      storyMetrics.warmTotalPromptTimeMs = [];
      storyMetrics.warmAcceptanceRate = [];
      storyMetrics.warmTokensPerSecond = [];

      for (let i = 0; i < WARM_RUNS; i++) {
        updateUI(
          'running', `Executing warm prompt ${i + 1}/${WARM_RUNS}...`, '--',
          'Running');
        const warmSession =
          await LanguageModel.create(story.createOptions);
        try {
          const warmRes = await runPromptStream(warmSession, story.getPrompt());
          storyMetrics.warmTimeToFirstTokenMs.push(warmRes.timeToFirstTokenMs);
          storyMetrics.warmTotalPromptTimeMs.push(warmRes.totalTimeMs);
          storyMetrics.warmAcceptanceRate.push(warmRes.acceptanceRate);
          storyMetrics.warmTokensPerSecond.push(warmRes.tokensPerSecond);

          console.log(
            `[Warm Run ${i + 1} Output for ${story.name}]: ` +
            `${warmRes.responseText}`);
        } finally {
          warmSession.destroy();
        }
      }

      return storyMetrics;

    } catch (e) {
      console.error(`Error in runStory for ${story.name}:`, e);
      throw e;
    }
  }

  function average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function createStoryCard(storyKey, storyMetrics) {
    const story = STORIES[storyKey];
    const template = document.getElementById('story-card-template');
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
      story.createOptions.samplingMode ?? 'default';

    return { card, avgWarmTps };
  }

  function flattenResults(results) {
    const flattened = {};
    for (const [storyKey, storyMetrics] of Object.entries(results)) {
      if (storyKey.includes('.')) {
        throw new Error(
          `storyKey "${storyKey}" cannot contain delimiter "."`);
      }
      for (const [metricKey, val] of Object.entries(storyMetrics)) {
        if (metricKey.includes('.')) {
          throw new Error(
            `metricKey "${metricKey}" cannot contain delimiter "."`);
        }
        flattened[`${storyKey}.${metricKey}`] = val;
      }
    }
    return flattened;
  }

  async function runAITest() {
    if (startBtn) startBtn.disabled = true;
    window.testStatus = 'running';
    resultsPanel.classList.remove('visible');
    storyResults.innerHTML = '';

    try {
      if (typeof LanguageModel === 'undefined') {
        throw new Error(
          'LanguageModel API is not available. ' +
          'Ensure experimental flags are enabled.');
      }

      const urlParams = new URLSearchParams(window.location.search);
      const storiesParam = urlParams.get('stories');
      const enabledStories =
        storiesParam ? storiesParam.split(',') : ['language_model'];

      const availability = await LanguageModel.availability();
      if (!['available', 'downloadable', 'downloading'].includes(
        availability)) {
        throw new Error('Model not available (status: ' + availability + ')');
      }

      // TODO(https://crbug.com/549798622): We should rename this and the
      // associated metrics since they also include session creation.
      let downloadTimeMs = 0;

      if (availability !== 'available') {
        updateUI('running', 'Downloading model...', '--', 'Loading');
        setProgress(0);

        const monitor = (m) => {
          m.addEventListener('downloadprogress', (e) => {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            updateUI(
              'running', `Downloading Model: ${pct}%`, pct + '%',
              'Downloading');
          });
        };

        const startCreate = performance.now();
        const initialSession = await LanguageModel.create({ monitor });
        const endCreate = performance.now();
        initialSession.destroy();

        downloadTimeMs = endCreate - startCreate;
        await offloadModel();
      } else {
        setProgress(100);
      }

      const results = {};
      let isFirst = true;

      for (const storyKey of enabledStories) {
        const story = STORIES[storyKey];
        if (!story) {
          console.warn(`Skipping invalid story key: ${storyKey}`);
          continue;
        }

        const supportStatus =
          await LanguageModel.availability(story.createOptions);
        if (supportStatus !== 'available') {
          console.log(
            `Model does not support capabilities for ${storyKey} ` +
            `(status: ${supportStatus}). Skipping story.`);
          continue;
        }

        if (!isFirst) {
          await offloadModel();
        }
        isFirst = false;
        results[storyKey] = await runStory(story);
      }

      if (Object.keys(results).length === 0) {
        throw new Error('No valid stories were executed.');
      }

      window.metrics = flattenResults(results);
      window.metrics.downloadTimeMs = downloadTimeMs;

      window.testStatus = 'success';

      resDownload.textContent = downloadTimeMs > 0 ?
        Math.round(downloadTimeMs) + ' ms' :
        'Cached (0 ms)';

      let totalWarmTps = 0;
      for (const [storyKey, storyMetrics] of Object.entries(results)) {
        const { card, avgWarmTps } = createStoryCard(storyKey, storyMetrics);
        storyResults.appendChild(card);
        totalWarmTps += avgWarmTps;
      }

      resultsPanel.classList.add('visible');

      const overallAvgTps = totalWarmTps / Object.keys(results).length;
      updateUI(
        'success', 'Benchmark Completed!', overallAvgTps.toFixed(2), 't/sec');
      return window.metrics;

    } catch (e) {
      window.testStatus = 'failed';
      setProgress(0);
      updateUI('failed', 'Failed: ' + e.message, 'ERR', 'Error');
      throw e;
    }
  }
  window.addEventListener('load', async () => {
    updateUI('running', 'Preloading audio...', '--', 'Loading');
    try {
      const audioEl = document.getElementById('input-audio-dream');
      const arrayBuffer = await (await fetch(audioEl.src)).arrayBuffer();
      cachedAudioBuffer =
        await (new AudioContext()).decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error('Failed to preload audio:', e);
    }

    window.testStatus = 'waiting';
    updateUI('waiting', 'Ready', '--', 'Ready');
    startBtn.disabled = false;
    startBtn.addEventListener('click', runAITest);
  });
})();
