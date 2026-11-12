const gaugeFill = document.getElementById('gauge-fill');
const gaugeValue = document.getElementById('gauge-value');
const gaugeLabel = document.getElementById('gauge-label');
const statusText = document.getElementById('status-text');
const statusSpinner = document.getElementById('status-spinner');

const R = 100;
const CIRCUMFERENCE = 2 * Math.PI * R;

const WARM_RUNS = 5;

export function setProgress(percent) {
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  if (gaugeFill) gaugeFill.style.strokeDashoffset = offset;
}

export function updateUI(state, message, val, label) {
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

export function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function measureStreamingRun(startStream) {
  const startTime = performance.now();
  const stream = startStream();
  let firstChunk;
  let firstChunkTime;
  let timeToFirstTokenMs = 0;
  let responseText = '';
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;
    if (!firstChunkTime) {
      firstChunk = chunk;
      firstChunkTime = performance.now();
      timeToFirstTokenMs = firstChunkTime - startTime;
    }
    if (typeof chunk === 'string') {
      responseText += chunk;
    } else if (chunk && chunk.type === 'tool-call' && chunk.value) {
      responseText += JSON.stringify({
        type: chunk.type,
        value: {
          callId: chunk.value.callId ?? chunk.value.callID,
          name: chunk.value.name,
          arguments: chunk.value.arguments,
        },
      });
    } else if (chunk && chunk.type === 'text') {
      responseText += chunk.value;
    } else {
      responseText += JSON.stringify(chunk);
    }
  }

  const totalTimeMs = performance.now() - startTime;
  const durationSec = (performance.now() - firstChunkTime) / 1000;

  return {
    timeToFirstTokenMs,
    totalTimeMs,
    durationSec,
    chunkCount,
    firstChunk,
    responseText,
  };
}

// Sleep 12s (exceeding Chrome's 10s idle timeout) so the on-device model is
// offloaded before the next cold measurement.
export async function offloadModel() {
  console.log('Sleeping 12s to allow model offloading...');
  updateUI('running', 'Waiting for model offload (12s)...', '--', 'Waiting');
  await new Promise(resolve => setTimeout(resolve, 12000));
}

export async function runColdAndWarm({
  storyName,
  createSession,
  runIteration,
}) {
  const startCreate = performance.now();
  const session = await createSession();
  const endCreate = performance.now();
  setProgress(100);

  const sessionCreationTimeMs = endCreate - startCreate;
  let coldResult;
  try {
    updateUI('running', 'Executing cold prompt...', '--', 'Running');
    coldResult = await runIteration(session);
    console.log(
      `[Cold Run Output for ${storyName}]: ${coldResult.responseText}`);
  } finally {
    session.destroy();
  }

  const warmResults = [];
  for (let i = 0; i < WARM_RUNS; i++) {
    updateUI(
      'running', `Executing warm prompt ${i + 1}/${WARM_RUNS}...`, '--',
      'Running');
    const warmSession = await createSession();
    try {
      const warmRes = await runIteration(warmSession);
      warmResults.push(warmRes);
      console.log(
        `[Warm Run ${i + 1} Output for ${storyName}]: ` +
        `${warmRes.responseText}`);
    } finally {
      warmSession.destroy();
    }
  }

  return { sessionCreationTimeMs, coldResult, warmResults };
}
