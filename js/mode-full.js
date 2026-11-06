// 完整手洗體驗版：洗牌（可用滑鼠手搓打亂）、整牌、切牌、開扇選牌

function initFullMode() {
  const fullDeck = buildDeck();
  let order = shuffledCopy(fullDeck);
  const drawnIds = new Set();

  const deckAreaEl = document.getElementById("full-deck-area");
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
  let lastX = 0;
  let lastY = 0;
  let cumulativeDist = 0; // 這次拖曳累積移動了多少距離，持續移動就持續增加，不是只看頭尾距離
  let dragAngle = 0; // 最近一小段移動的方向，用來讓散開的牌偏向手指/滑鼠移動的方向
  let scatterAmount = 0; // 0 = 整齊一疊，1 = 散滿整張桌子
  let scatterCards = []; // { el, spread, reach, rot, baseOffset }

  const SCATTER_LAYERS = 40; // 手搓時要有夠多張牌可以散開，看起來才像整副牌被打亂
  const SCATTER_DISTANCE_FOR_FULL = 900; // 累積拖曳這個距離，散開程度就會到頂

  // 手機螢幕比較窄，散開的範圍要跟著畫面寬度縮小，不然牌會飛出螢幕外
  function getScatterReach() {
    return Math.min(190, window.innerWidth * 0.4);
  }

  function remainingCards() {
    return order.filter((card) => !drawnIds.has(card.id));
  }

  function showOnly(view) {
    // view: "stack" | "cut" | "fan" | "none"
    deckStackEl.classList.toggle("hidden", view !== "stack");
    cutAreaEl.classList.toggle("hidden", view !== "cut");
    fanAreaEl.classList.toggle("hidden", view !== "fan");
  }

  // 每張散落牌各自隨機分配一個相對於「撥動方向」的偏角與距離，手搓時才會看起來像
  // 真的被手撥散在桌上（大致往你撥的方向飛，但不是每張都精準同一個角度）
  function randomizeScatterPattern() {
    scatterCards.forEach((c) => {
      c.spread = (Math.random() - 0.5) * Math.PI * 1.3; // 以撥動方向為中心，左右各偏最多約117度
      c.reach = 0.5 + Math.random() * 0.5;
      c.rot = (Math.random() - 0.5) * 80;
    });
  }

  function renderStack() {
    createBackStackLayers(deckStackEl, SCATTER_LAYERS);
    scatterCards = Array.from(deckStackEl.querySelectorAll(".stack-card")).map((el, i) => ({
      el,
      spread: 0,
      reach: 0,
      rot: 0,
      baseOffset: i * -0.6,
      // 休息時牌堆不是每張都完全貼齊，留一點點隨機誤差看起來更自然
      restJitterX: (Math.random() - 0.5) * 3,
      restJitterY: (Math.random() - 0.5) * 3,
      restJitterRot: (Math.random() - 0.5) * 3,
    }));
    randomizeScatterPattern();
    scatterAmount = 0;
    scatterCards.forEach((c) => {
      c.el.style.transition = "none";
    });
    applyScatter(0, 0);
  }

  function restTransform(c) {
    const x = c.baseOffset + c.restJitterX;
    const y = c.baseOffset + c.restJitterY;
    return `translate(${x}px, ${y}px) rotate(${c.restJitterRot}deg)`;
  }

  function applyScatter(amount, angle) {
    scatterAmount = Math.max(0, Math.min(1, amount));
    const maxReach = getScatterReach();
    scatterCards.forEach((c) => {
      if (scatterAmount <= 0.001) {
        c.el.style.transform = restTransform(c);
        return;
      }
      const effectiveAngle = angle + c.spread;
      const dist = maxReach * c.reach * scatterAmount;
      const dx = Math.cos(effectiveAngle) * dist + c.baseOffset;
      const dy = Math.sin(effectiveAngle) * dist + c.baseOffset;
      const rot = c.rot * scatterAmount;
      c.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    });
  }

  function setManualShuffle(on) {
    manualShuffleOn = on;
    btnShuffle.classList.toggle("active", on);
    deckAreaEl.classList.toggle("shuffle-active", on);
    deckHintEl.textContent = on
      ? "按著牌堆滑動（手機用手指滑），牌會跟著你撥動的方向散開"
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
      scatterCards.forEach((c) => {
        c.el.style.transition = "transform 0.3s ease";
      });
    } else {
      setManualShuffle(false);
    }
  }

  deckStackEl.addEventListener("pointerdown", (e) => {
    if (!manualShuffleOn) return;
    e.preventDefault(); // 擋掉瀏覽器原生的圖片拖曳手勢，改用我們自己的散牌邏輯
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    cumulativeDist = scatterAmount * SCATTER_DISTANCE_FOR_FULL;
    scatterCards.forEach((c) => {
      c.el.style.transition = "transform 0.08s linear";
    });
    deckStackEl.setPointerCapture(e.pointerId);
  });

  deckStackEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const stepDx = e.clientX - lastX;
    const stepDy = e.clientY - lastY;
    const stepDist = Math.hypot(stepDx, stepDy);
    if (stepDist < 1) return;

    cumulativeDist += stepDist;
    dragAngle = Math.atan2(stepDy, stepDx);
    lastX = e.clientX;
    lastY = e.clientY;

    // 移動量本身會持續把牌打亂得更散，而不是只看起點到現在的直線距離，
    // 這樣一直來回撥動也會持續洗亂，跟真的手搓牌一樣
    if (Math.random() < 0.35) shuffleOnce();
    applyScatter(cumulativeDist / SCATTER_DISTANCE_FOR_FULL, dragAngle);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    scatterCards.forEach((c) => {
      c.el.style.transition = "transform 0.3s ease";
    });
    // 牌就留在撥散後的樣子，不會自動收回——按「整牌」才會收攏
  }

  deckStackEl.addEventListener("pointerup", endDrag);
  deckStackEl.addEventListener("pointercancel", endDrag);

  // 整牌分兩階段：先鬆鬆地收攏成一束（還有點參差不齊），
  // 再對齊角落收成整齊的一疊，模擬現實中收牌、對齊牌緣的兩個動作
  function collectCards() {
    scatterCards.forEach((c, i) => {
      c.el.style.transition = "transform 0.22s ease-in";
      const wobbleX = (Math.random() - 0.5) * 18 + c.baseOffset;
      const wobbleY = (i - scatterCards.length / 2) * 1.4 + c.baseOffset;
      const wobbleRot = (Math.random() - 0.5) * 16;
      c.el.style.transform = `translate(${wobbleX}px, ${wobbleY}px) rotate(${wobbleRot}deg)`;
    });

    window.setTimeout(() => {
      scatterCards.forEach((c) => {
        c.el.style.transition = "transform 0.32s cubic-bezier(.22,.61,.36,1)";
        c.el.style.transform = restTransform(c);
      });
      scatterAmount = 0;
    }, 220);
  }

  function onArrangeClick() {
    setManualShuffle(false);
    showOnly("stack");
    collectCards();
    deckHintEl.textContent = "牌已經整理成一疊了";
  }

  function renderCutRow() {
    cutAreaEl.innerHTML = "";
    const cards = remainingCards();
    const n = cards.length;
    const mid = (n - 1) / 2;
    const containerWidth = cutAreaEl.clientWidth || window.innerWidth;
    const cardWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-w")) || 90;
    // 跟開扇一樣：間距依容器寬度縮放，讓整排牌剛好塞進畫面，不需要橫向捲軸
    const spacing = Math.max(2, Math.min(14, (containerWidth - cardWidth) / Math.max(1, n - 1)));

    cards.forEach((card, i) => {
      const el = document.createElement("div");
      el.className = "cut-card";
      el.style.setProperty("--cut-x", `${(i - mid) * spacing}px`);
      el.style.zIndex = String(i);
      const img = document.createElement("img");
      img.alt = "塔羅牌背";
      makeImageNonDraggable(img);
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

  function renderFan(animate) {
    const cards = remainingCards();
    if (cards.length === 0) {
      showOnly("none");
      deckHintEl.textContent = "牌已經抽完囉，點「重新開始」再洗一次牌";
      return;
    }
    const entries = renderFanLayout(fanAreaEl, cards, animate);
    entries.forEach(({ el, card, frontImg }) => {
      el.addEventListener("click", () => drawCard(card, el, frontImg));
    });
  }

  function onFanClick() {
    setManualShuffle(false);
    showOnly("fan");
    deckHintEl.textContent = "點一張牌把它抽出來";
    renderFan(true);
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
