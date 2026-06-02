(() => {
  window.testStatus = "waiting";
  window.metrics = {};

  const gaugeFill = document.getElementById("gauge-fill");
  const gaugeValue = document.getElementById("gauge-value");
  const gaugeLabel = document.getElementById("gauge-label");
  const startBtn = document.getElementById("start-button");
  const statusText = document.getElementById("status-text");
  const statusSpinner = document.getElementById("status-spinner");
  const resultsPanel = document.getElementById("results-panel");

  const resDownload = document.getElementById("res-download");
  const resSession = document.getElementById("res-session");
  const resTtft = document.getElementById("res-ttft");
  const resWarmTtft = document.getElementById("res-warm-ttft");
  const resTotal = document.getElementById("res-total");
  const resWarmTotal = document.getElementById("res-warm-total");

  const R = 100;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  const DEFAULT_PROMPT = "Tell me a very short joke.";

  function setProgress(percent) {
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    if (gaugeFill) gaugeFill.style.strokeDashoffset = offset;
  }

  function updateUI(state, message, val, label) {
    if (statusText) {
      statusText.className = "status-text " + state;
      statusText.textContent = message;
    }
    if (gaugeValue) gaugeValue.textContent = val;
    if (gaugeLabel) gaugeLabel.textContent = label;
    if (statusSpinner) {
      statusSpinner.style.display = state === "running" ? "block" : "none";
    }
  }

  async function runPrompt(session, prompt) {
    const startTime = performance.now();
    const stream = session.promptStreaming(prompt);
    let firstTokenTime;
    let chunkCount = 0;
    let timeToFirstTokenMs = 0;

    for await (const chunk of stream) {
      if (!firstTokenTime) {
        firstTokenTime = performance.now();
        timeToFirstTokenMs = firstTokenTime - startTime;
      }
      chunkCount++;
    }

    const totalTimeMs = performance.now() - startTime;
    const durationSec = (performance.now() - firstTokenTime) / 1000;
    const chunksPerSecond =
        durationSec > 0 ? (chunkCount - 1) / durationSec : 0;

    return {
      timeToFirstTokenMs,
      totalTimeMs,
      chunksPerSecond,
    };
  }

  async function runAITest() {
    if (startBtn) startBtn.disabled = true;
    window.testStatus = "running";
    updateUI("running", "Initializing AI Model...", "--", "Loading");
    setProgress(0);

    let session;

    try {
      if (typeof LanguageModel === 'undefined') {
        throw new Error(
            "LanguageModel API is not available. " +
            "Ensure experimental flags are enabled.");
      }

      const availability = await LanguageModel.availability();
      if (!["available", "downloadable", "downloading"].includes(
              availability)) {
        throw new Error("Model not available (status: " + availability + ")");
      }

      updateUI(
          "running", "Creating Session & Downloading...", "--", "Downloading");

      const startCreate = performance.now();
      let downloadEnd;

      // 1. Session creation & download
      session = await LanguageModel.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            updateUI(
                "running", `Downloading Model: ${pct}%`, pct + "%",
                "Downloading");
            if (e.loaded === e.total) {
              downloadEnd = performance.now();
            }
          });
        }
      });

      const endCreate = performance.now();
      setProgress(100);

      // Calculate initialization metrics
      window.metrics.downloadTimeMs = downloadEnd - startCreate;
      window.metrics.sessionCreationTimeMs = endCreate - downloadEnd;

      // 2. Cold Prompt execution (First run)
      updateUI("running", "Executing cold prompt...", "--", "Running");
      const coldMetrics = await runPrompt(session, DEFAULT_PROMPT);
      window.metrics.coldTimeToFirstTokenMs = coldMetrics.timeToFirstTokenMs;
      window.metrics.coldTotalPromptTimeMs = coldMetrics.totalTimeMs;
      window.metrics.coldChunksPerSecond = coldMetrics.chunksPerSecond;

      // 3. Warm Prompt execution (Subsequent runs)
      const WARM_RUNS = 5;
      window.metrics.warmTimeToFirstTokenMs = [];
      window.metrics.warmTotalPromptTimeMs = [];
      window.metrics.warmChunksPerSecond = [];

      for (let i = 0; i < WARM_RUNS; i++) {
        updateUI(
            "running", `Executing warm prompt ${i + 1}/${WARM_RUNS}...`, "--",
            "Running");
        const warmMetrics = await runPrompt(session, DEFAULT_PROMPT);
        window.metrics.warmTimeToFirstTokenMs.push(
            warmMetrics.timeToFirstTokenMs);
        window.metrics.warmTotalPromptTimeMs.push(warmMetrics.totalTimeMs);
        window.metrics.warmChunksPerSecond.push(warmMetrics.chunksPerSecond);
      }

      window.testStatus = "success";

      // Display results
      resDownload.textContent = window.metrics.downloadTimeMs > 0 ?
          Math.round(window.metrics.downloadTimeMs) + " ms" :
          "Cached (0 ms)";
      resSession.textContent =
          Math.round(window.metrics.sessionCreationTimeMs) + " ms";
      resTtft.textContent =
          Math.round(window.metrics.coldTimeToFirstTokenMs) + " ms";
      resTotal.textContent =
          Math.round(window.metrics.coldTotalPromptTimeMs) + " ms";

      const avgWarmTtft =
          window.metrics.warmTimeToFirstTokenMs.reduce((a, b) => a + b, 0) /
          WARM_RUNS;
      const avgWarmTotal =
          window.metrics.warmTotalPromptTimeMs.reduce((a, b) => a + b, 0) /
          WARM_RUNS;
      resWarmTtft.textContent = Math.round(avgWarmTtft) + " ms (avg)";
      resWarmTotal.textContent = Math.round(avgWarmTotal) + " ms (avg)";

      resultsPanel.classList.add("visible");

      // Show the average warm CPS in the final UI status for convenience
      const avgWarmCps =
          window.metrics.warmChunksPerSecond.reduce((a, b) => a + b, 0) /
          WARM_RUNS;
      updateUI(
          "success", "Benchmark Completed!", avgWarmCps.toFixed(2), "c/sec");
      return window.metrics;

    } catch (e) {
      window.testStatus = "failed";
      setProgress(0);
      updateUI("failed", "Failed: " + e.message, "ERR", "Error");
      throw e;
    } finally {
      if (session) {
        session.destroy();
      }
    }
  }

  startBtn.addEventListener('click', runAITest);
})();