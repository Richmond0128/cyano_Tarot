// 快速版：先選要抽幾張，牌自動洗好攤開，點牌出牌並判斷正逆位，抽完可選擇要不要再抽

function initQuickMode() {
  const fullDeck = buildDeck();

  let order = [];
  const drawnIds = new Set();
  let target = 3;
  let drawnCount = 0;

  const setupEl = document.getElementById("quick-setup");
  const countInput = document.getElementById("quick-count-input");
  const btnStart = document.getElementById("btn-quick-start");
  const countBtns = document.querySelectorAll(".quick-count-btn");

  const tableEl = document.getElementById("quick-table");
  const progressEl = document.getElementById("quick-progress-text");
  const fanAreaEl = document.getElementById("quick-fan-area");

  const drawnAreaEl = document.getElementById("quick-drawn-area");
  const drawnCardsEl = document.getElementById("quick-drawn-cards");
  const morePromptEl = document.getElementById("quick-more-prompt");
  const btnMore = document.getElementById("btn-quick-more");
  const btnFinish = document.getElementById("btn-quick-finish");
  const btnRestart = document.getElementById("btn-quick-restart");

  function remainingCards() {
    return order.filter((card) => !drawnIds.has(card.id));
  }

  countBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      countBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      countInput.value = btn.dataset.count;
    });
  });

  function updateProgress() {
    const left = target - drawnCount;
    progressEl.textContent = left > 0
      ? `請抽牌，還可以抽 ${left} 張`
      : "這輪抽牌結束了";
  }

  function startQuick() {
    const n = Math.max(1, Math.min(78, parseInt(countInput.value, 10) || 1));
    target = n;
    drawnCount = 0;
    drawnIds.clear();
    order = shuffledCopy(fullDeck);
    drawnCardsEl.innerHTML = "";

    setupEl.classList.add("hidden");
    tableEl.classList.remove("hidden");
    drawnAreaEl.classList.remove("hidden");
    morePromptEl.classList.add("hidden");

    updateProgress();
    renderFan();
  }

  function renderFan() {
    const cards = remainingCards();
    const entries = renderFanLayout(fanAreaEl, cards);
    entries.forEach(({ el, card, frontImg }) => {
      el.addEventListener("click", () => drawCard(card, el, frontImg));
    });
    fanAreaEl.classList.toggle("fan-disabled", drawnCount >= target);
  }

  function drawCard(card, el, frontImg) {
    if (drawnCount >= target) return;
    if (el.classList.contains("flipping") || drawnIds.has(card.id)) return;

    const isReversed = Math.random() < 0.5;

    loadImageWithRetry(frontImg, card.image);
    if (isReversed) frontImg.classList.add("reversed-img");
    el.classList.add("flipping");

    window.setTimeout(() => {
      el.classList.add("drawn");
      drawnIds.add(card.id);
      drawnCount++;
      drawnCardsEl.appendChild(createDrawnTile(card, isReversed));
      updateProgress();

      if (drawnCount >= target) {
        fanAreaEl.classList.add("fan-disabled");
        morePromptEl.classList.remove("hidden");
      } else if (remainingCards().length === 0) {
        progressEl.textContent = "牌已經抽完囉";
        morePromptEl.classList.add("hidden");
      }
    }, 650);
  }

  function drawMore() {
    if (remainingCards().length === 0) return;
    target += 1;
    morePromptEl.classList.add("hidden");
    fanAreaEl.classList.remove("fan-disabled");
    updateProgress();
  }

  function finish() {
    morePromptEl.classList.add("hidden");
    progressEl.textContent = `這輪共抽了 ${drawnCount} 張牌`;
    fanAreaEl.classList.add("hidden");
  }

  function restart() {
    setupEl.classList.remove("hidden");
    tableEl.classList.add("hidden");
    drawnAreaEl.classList.add("hidden");
    fanAreaEl.classList.remove("hidden");
    fanAreaEl.innerHTML = "";
    drawnCardsEl.innerHTML = "";
  }

  btnStart.addEventListener("click", startQuick);
  btnMore.addEventListener("click", drawMore);
  btnFinish.addEventListener("click", finish);
  btnRestart.addEventListener("click", restart);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (tableEl.classList.contains("hidden")) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderFan, 150);
  });
}
