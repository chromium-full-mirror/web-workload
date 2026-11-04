import { API_CONFIG as LANGUAGE_MODEL_API } from './apis/language_model.js';
import { offloadModel, setProgress, updateUI } from './runner.js';

const startBtn = document.getElementById('start-button');
const resultsPanel = document.getElementById('results-panel');
const resDownload = document.getElementById('res-download');
const storyResults = document.getElementById('story-results');

startBtn.disabled = true;

const DEFAULT_API_NAME = 'language_model';
const API_CONFIGS = Object.freeze([
  LANGUAGE_MODEL_API,
]);

function getApiConfig(apiName) {
  const apiConfig = API_CONFIGS.find(config => config.name === apiName);
  if (!apiConfig) {
    throw new Error(`Unknown API name: ${apiName}`);
  }
  return apiConfig;
}

async function runStory(story) {
  console.log(`Running story: ${story.name}`);
  updateUI('running', `Initializing ${story.name}...`, '--', 'Loading');
  setProgress(0);

  try {
    return await story.run();
  } catch (e) {
    console.error(`Error in runStory for ${story.name}:`, e);
    throw e;
  }
}

function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function createStoryCard(story, storyMetrics) {
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
    story.createOptions?.samplingMode ?? 'default';

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

// TODO(https://crbug.com/549798622): We should rename this and the
// associated metrics since they also include session creation.
async function downloadModel(apiConfig, initialOptions) {
  const availability = await apiConfig.availability(initialOptions);
  if (!['available', 'downloadable', 'downloading'].includes(
    availability)) {
    throw new Error('Model not available (status: ' + availability + ')');
  }

  if (availability === 'available') {
    setProgress(100);
    return 0;
  }

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
  const initialSession =
    await apiConfig.createSession({ ...initialOptions, monitor });
  const endCreate = performance.now();
  initialSession.destroy();

  if (apiConfig.needsOffload) {
    await offloadModel();
  }
  return endCreate - startCreate;
}

async function runAITest(apiConfig) {
  startBtn.disabled = true;
  window.testStatus = 'running';
  resultsPanel.classList.remove('visible');
  storyResults.innerHTML = '';

  try {
    if (!apiConfig.isSupported()) {
      throw new Error(
        `${apiConfig.label} API is not available. ` +
        'Ensure experimental flags are enabled.');
    }

    const storiesMap = apiConfig.stories;
    const urlParams = new URLSearchParams(window.location.search);
    const storiesParam = urlParams.get('stories');
    const enabledStories =
      storiesParam ? storiesParam.split(',') : apiConfig.defaultStories;

    const firstStory = enabledStories.map(k => storiesMap[k]).find(Boolean);
    if (!firstStory) {
      throw new Error('No valid stories were executed.');
    }
    const downloadTimeMs =
      await downloadModel(apiConfig, firstStory.createOptions);

    const results = {};
    let isFirst = true;

    for (const storyKey of enabledStories) {
      const story = storiesMap[storyKey];
      if (!story) {
        console.warn(`Skipping invalid story key: ${storyKey}`);
        continue;
      }

      const supportStatus =
        await apiConfig.availability(story.createOptions);
      if (supportStatus !== 'available') {
        console.log(
          `Model does not support capabilities for ${storyKey} ` +
          `(status: ${supportStatus}). Skipping story.`);
        continue;
      }

      if (!isFirst && apiConfig.needsOffload) {
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
      const story = storiesMap[storyKey];
      const { card, avgWarmTps } = createStoryCard(story, storyMetrics);
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

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const apiName = urlParams.get('api') || DEFAULT_API_NAME;
  let apiConfig;
  try {
    apiConfig = getApiConfig(apiName);
  } catch (e) {
    console.error('Failed to load API configuration:', e);
    window.testStatus = 'failed';
    updateUI('failed', 'Failed: ' + e.message, 'ERR', 'Error');
    return;
  }

  window.testStatus = 'waiting';
  updateUI('waiting', 'Ready', '--', 'Ready');
  startBtn.disabled = false;
  startBtn.addEventListener('click', () => runAITest(apiConfig));
}

if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
