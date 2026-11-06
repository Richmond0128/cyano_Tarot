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
  let scatterAtDragStart = 0;
  let scatterAmount = 0; // 0 = 整齊一疊，1 = 散滿整張桌子
  let scatterCards = []; // { el, angle, reach, rot, baseOffset }

  const SCATTER_LAYERS = 12;
  const SCATTER_MAX_REACH = 95; // px，手搓時最多能把牌推多遠

  function remainingCards() {
    return order.filter((card) => !drawnIds.has(card.id));
  }

  function showOnly(view) {
    // view: "stack" | "cut" | "fan" | "none"
    deckStackEl.classList.toggle("hidden", view !== "stack");
    cutAreaEl.classList.toggle("hidden", view !== "cut");
    fanAreaEl.classList.toggle("hidden", view !== "fan");
  }

  // 每張散落牌各自隨機分配一個方向/距離/角度，手搓時才會看起來像
  // 真的被撥散在桌上，而不是整疊牌當成一塊硬板在轉
  function randomizeScatterPattern() {
    scatterCards.forEach((c) => {
      c.angle = Math.random() * Math.PI * 2;
      c.reach = 0.45 + Math.random() * 0.55;
      c.rot = (Math.random() - 0.5) * 70;
    });
  }

  function renderStack() {
    createBackStackLayers(deckStackEl, SCATTER_LAYERS);
    scatterCards = Array.from(deckStackEl.querySelectorAll(".stack-card")).map((el, i) => ({
      el,
      angle: 0,
      reach: 0,
      rot: 0,
      baseOffset: i * -1.2,
    }));
    randomizeScatterPattern();
    scatterAmount = 0;
    applyScatter(0);
  }

  function applyScatter(amount) {
    scatterAmount = Math.max(0, Math.min(1, amount));
    scatterCards.forEach((c) => {
      if (scatterAmount <= 0.001) {
        c.el.style.transform = `translate(${c.baseOffset}px, ${c.baseOffset}px)`;
        return;
      }
      const dist = SCATTER_MAX_REACH * c.reach * scatterAmount;
      const dx = Math.cos(c.angle) * dist + c.baseOffset;
      const dy = Math.sin(c.angle) * dist + c.baseOffset;
      const rot = c.rot * scatterAmount;
      c.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    });
  }

  function setManualShuffle(on) {
    manualShuffleOn = on;
    btnShuffle.classList.toggle("active", on);
    deckHintEl.textContent = on
      ? "按著牌堆拖曳，像手搓牌一樣把牌撥散打亂"
      : "洗好了，可以「整牌」收攏、「切牌」或直接「開扇」選牌";
  }

  function shuffleOnce() {
    const kept = order.filter((c) => drawnIds.has(c.id));
    const rest = shuffledCopy(order.filter((c) => !drawnIds.has(c.id)));
    order = kept.concat(rest);
  }

  function onShuffleClick() {
    if (!manualShuffleOn) {
      showOnly("stack");
      setManualShuffle(true);
      shuffleOnce();
      randomizeScatterPattern();
      applyScatter(0.25); // 先稍微鬆開一點，提示牌可以被撥動
    } else {
      setManualShuffle(false);
    }
  }

  deckStackEl.addEventListener("pointerdown", (e) => {
    if (!manualShuffleOn) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    scatterAtDragStart = scatterAmount;
    randomizeScatterPattern();
    deckStackEl.setPointerCapture(e.pointerId);
  });

  deckStackEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const dist = Math.hypot(dx, dy);
    applyScatter(scatterAtDragStart + dist / 160);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const moved = Math.hypot(dx, dy) > 12;
    if (moved) shuffleOnce();
    // 牌就留在撥散後的樣子，不會自動收回——按「整牌」才會收攏
  }

  deckStackEl.addEventListener("pointerup", endDrag);
  deckStackEl.addEventListener("pointercancel", endDrag);

  function onArrangeClick() {
    setManualShuffle(false);
    showOnly("stack");
    applyScatter(0);
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

    setManualShuffle(false);
    showOnly("stack");
    renderStack();
    deckStackEl.classList.add("shuffling");
    window.setTimeout(() => deckStackEl.classList.remove("shuffling"), 300);
    deckHintEl.textContent = "切好牌了";
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
      showOnly("none");
      deckHintEl.textContent = "牌已經抽完囉，點「重新開始」再洗一次牌";
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
