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
  const resTotal = document.getElementById("res-total");

  const R = 100;
  const CIRCUMFERENCE = 2 * Math.PI * R;

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

  async function runAITest() {
    if (startBtn) startBtn.disabled = true;
    window.testStatus = "running";
    updateUI("running", "Initializing AI Model...", "--", "Loading");
    setProgress(0);

    let session;

    try {
      if (typeof LanguageModel === 'undefined') {
        throw new Error("LanguageModel API is not available. Ensure experimental flags are enabled.");
      }

      const availability = await LanguageModel.availability();
      if (!["available", "downloadable", "downloading"].includes(availability)) {
        throw new Error("Model not available (status: " + availability + ")");
      }

      updateUI("running", "Creating Session & Downloading...", "--", "Downloading");

      const startCreate = performance.now();
      let downloadEnd;

      // 1. Session creation & download
      session = await LanguageModel.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            updateUI("running", `Downloading Model: ${pct}%`, pct + "%", "Downloading");
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

      // 2. Prompt execution
      updateUI("running", "Executing prompt...", "--", "Running");
      const promptStart = performance.now();
      const stream = session.promptStreaming("Tell me a very short joke.");
      let firstTokenTime;
      let chunkCount = 0;

      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          window.metrics.timeToFirstTokenMs = firstTokenTime - promptStart;
        }
        chunkCount++;
      }

      window.metrics.totalPromptTimeMs = performance.now() - promptStart;
      const durationSec = window.metrics.totalPromptTimeMs / 1000;
      window.metrics.chunksPerSecond = chunkCount / durationSec;

      window.testStatus = "success";

      // Display results
      resDownload.textContent = window.metrics.downloadTimeMs > 0
        ? Math.round(window.metrics.downloadTimeMs) + " ms"
        : "Cached (0 ms)";
      resSession.textContent = Math.round(window.metrics.sessionCreationTimeMs) + " ms";
      resTtft.textContent = Math.round(window.metrics.timeToFirstTokenMs) + " ms";
      resTotal.textContent = Math.round(window.metrics.totalPromptTimeMs) + " ms";
      resultsPanel.classList.add("visible");

      updateUI("success", "Benchmark Completed!", window.metrics.chunksPerSecond.toFixed(2), "c/sec");
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