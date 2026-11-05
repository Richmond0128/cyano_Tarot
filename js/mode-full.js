// 完整手洗體驗版：洗牌（可用滑鼠手搓打亂）、整牌、切牌、開扇選牌

function initFullMode() {
  const fullDeck = buildDeck();
  let order = shuffledCopy(fullDeck);
  const drawnIds = new Set();

  const deckStackEl = document.getElementById("full-deck-stack");
  const deckHintEl = document.getElementById("full-deck-hint");
  const cutAreaEl = document.getElementById("full-cut-area");
  const fanAreaEl = document.getElementById("full-fan-area");
  const drawnCardsEl = document.getElementById("full-drawn-cards");
  const drawCountEl = document.getElementById("full-draw-count-num");

  const btnShuffle = document.getElementById("btn-full-shuffle");
  const btnArrange = document.getElementById("btn-full-arrange");
  const btnCut = document.getElementById("btn-full-cut");
  const btnFan = document.getElementById("btn-full-fan");
  const btnReset = document.getElementById("btn-full-reset");

  let manualShuffleOn = false;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  function remainingCards() {
    return order.filter((card) => !drawnIds.has(card.id));
  }

  function showOnly(view) {
    // view: "stack" | "cut" | "fan"
    deckStackEl.classList.toggle("hidden", view !== "stack");
    cutAreaEl.classList.toggle("hidden", view !== "cut");
    fanAreaEl.classList.toggle("hidden", view !== "fan");
  }

  function renderStack() {
    createBackStackLayers(deckStackEl, 5);
  }

  function setManualShuffle(on) {
    manualShuffleOn = on;
    btnShuffle.classList.toggle("active", on);
    deckHintEl.textContent = on
      ? "可以直接按著牌堆拖曳手搓洗牌，再按一次「洗牌」結束"
      : "洗好了，可以「整牌」收攏、「切牌」或直接「開扇」選牌";
  }

  function shuffleOnce(animate) {
    const kept = order.filter((c) => drawnIds.has(c.id));
    const rest = shuffledCopy(order.filter((c) => !drawnIds.has(c.id)));
    order = kept.concat(rest);

    if (animate) {
      deckStackEl.classList.add("shuffling");
      window.setTimeout(() => deckStackEl.classList.remove("shuffling"), 300);
    }
  }

  function onShuffleClick() {
    if (!manualShuffleOn) {
      showOnly("stack");
      shuffleOnce(true);
      setManualShuffle(true);
    } else {
      setManualShuffle(false);
      deckStackEl.style.transform = "";
    }
  }

  deckStackEl.addEventListener("pointerdown", (e) => {
    if (!manualShuffleOn) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    deckStackEl.setPointerCapture(e.pointerId);
  });

  deckStackEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    deckStackEl.style.transition = "none";
    deckStackEl.style.transform = `translate(${dx * 0.3}px, ${dy * 0.3}px) rotate(${dx * 0.25}deg)`;
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const moved = Math.abs(dx) + Math.abs(dy) > 12;
    deckStackEl.style.transition = "transform 0.35s ease";
    deckStackEl.style.transform = "";
    if (moved) shuffleOnce(false);
  }

  deckStackEl.addEventListener("pointerup", endDrag);
  deckStackEl.addEventListener("pointercancel", endDrag);

  function onArrangeClick() {
    setManualShuffle(false);
    showOnly("stack");
    renderStack();
    deckHintEl.textContent = "牌已經整理成一疊了";
  }

  function renderCutRow() {
    cutAreaEl.innerHTML = "";
    const cards = remainingCards();
    const n = cards.length;
    cards.forEach((card, i) => {
      const el = document.createElement("div");
      el.className = "cut-card";
      el.style.zIndex = String(i);
      const img = document.createElement("img");
      img.alt = "塔羅牌背";
      loadImageWithRetry(img, CARD_BACK_IMAGE);
      el.appendChild(img);
      el.addEventListener("click", () => performCut(i));
      cutAreaEl.appendChild(el);
    });
  }

  function performCut(index) {
    if (index <= 0) return;
    const cards = remainingCards();
    const cutIds = new Set(cards.map((c) => c.id));
    const front = order.filter((c) => cutIds.has(c.id)).slice(0, index);
    const back = order.filter((c) => cutIds.has(c.id)).slice(index);
    const untouched = order.filter((c) => !cutIds.has(c.id));
    order = untouched.concat(back, front);

    deckHintEl.textContent = "切好牌了";
    setManualShuffle(false);
    showOnly("stack");
    renderStack();
    deckStackEl.classList.add("shuffling");
    window.setTimeout(() => deckStackEl.classList.remove("shuffling"), 300);
  }

  function onCutClick() {
    setManualShuffle(false);
    showOnly("cut");
    deckHintEl.textContent = "點牌堆中的某個位置，那裡就是切牌點";
    renderCutRow();
  }

  function renderFan() {
    const cards = remainingCards();
    if (cards.length === 0) {
      deckHintEl.textContent = "牌已經抽完囉，點「重新開始」再洗一次牌";
      showOnly("stack");
      deckStackEl.classList.add("hidden");
      return;
    }
    const entries = renderFanLayout(fanAreaEl, cards);
    entries.forEach(({ el, card, frontImg }) => {
      el.addEventListener("click", () => drawCard(card, el, frontImg));
    });
  }

  function onFanClick() {
    setManualShuffle(false);
    showOnly("fan");
    deckHintEl.textContent = "點一張牌把它抽出來";
    renderFan();
  }

  function drawCard(card, el, frontImg) {
    if (el.classList.contains("flipping") || drawnIds.has(card.id)) return;

    loadImageWithRetry(frontImg, card.image);
    el.classList.add("flipping");

    window.setTimeout(() => {
      el.classList.add("drawn");
      drawnIds.add(card.id);
      drawnCardsEl.appendChild(createDrawnTile(card));
      drawCountEl.textContent = String(drawnIds.size);

      if (remainingCards().length === 0) {
        deckHintEl.textContent = "牌已經抽完囉，點「重新開始」再洗一次牌";
        fanAreaEl.classList.add("hidden");
      }
    }, 650);
  }

  function onResetClick() {
    order = shuffledCopy(fullDeck);
    drawnIds.clear();
    drawCountEl.textContent = "0";
    drawnCardsEl.innerHTML = "";
    setManualShuffle(false);
    showOnly("stack");
    deckHintEl.textContent = "請先洗牌，再點選「開扇」選牌";
    renderStack();
  }

  btnShuffle.addEventListener("click", onShuffleClick);
  btnArrange.addEventListener("click", onArrangeClick);
  btnCut.addEventListener("click", onCutClick);
  btnFan.addEventListener("click", onFanClick);
  btnReset.addEventListener("click", onResetClick);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (fanAreaEl.classList.contains("hidden")) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderFan, 150);
  });

  renderStack();
}
