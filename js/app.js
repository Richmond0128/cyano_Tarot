(function () {
  const fullDeck = buildDeck();

  let order = shuffledCopy(fullDeck);
  const drawnIds = new Set();

  const deckStackEl = document.getElementById("deck-stack");
  const deckHintEl = document.getElementById("deck-hint");
  const fanAreaEl = document.getElementById("fan-area");
  const drawnCardsEl = document.getElementById("drawn-cards");
  const drawCountEl = document.getElementById("draw-count-num");

  const btnShuffle = document.getElementById("btn-shuffle");
  const btnSpread = document.getElementById("btn-spread");
  const btnReset = document.getElementById("btn-reset");

  function shuffledCopy(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function remainingCards() {
    return order.filter((card) => !drawnIds.has(card.id));
  }

  // 圖片數量多時瀏覽器/伺服器偶爾會有連線被拒的情況，失敗後重試一次
  function loadImageWithRetry(img, src) {
    let retried = false;
    img.onerror = () => {
      if (retried) return;
      retried = true;
      window.setTimeout(() => {
        img.src = src + "?retry=1";
      }, 400);
    };
    img.src = src;
  }

  function renderStack() {
    deckStackEl.innerHTML = "";
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const div = document.createElement("div");
      div.className = "stack-card";
      div.style.transform = `translate(${i * -1.2}px, ${i * -1.2}px)`;
      div.style.zIndex = String(layers - i);
      const img = document.createElement("img");
      img.alt = "塔羅牌背";
      loadImageWithRetry(img, CARD_BACK_IMAGE);
      div.appendChild(img);
      deckStackEl.appendChild(div);
    }
  }

  function renderFan() {
    fanAreaEl.innerHTML = "";
    const cards = remainingCards();
    const n = cards.length;
    if (n === 0) {
      deckHintEl.textContent = "牌已經抽完囉，點「重新開始」再洗一次牌";
      fanAreaEl.classList.add("hidden");
      return;
    }

    const mid = (n - 1) / 2;
    const angleStep = Math.min(2.5, 160 / n);
    const containerWidth = fanAreaEl.clientWidth || window.innerWidth;
    const maxSpacing = containerWidth < 500 ? 8 : 14;
    const spacing = Math.min(maxSpacing, (containerWidth * 0.92) / n);

    cards.forEach((card, i) => {
      const offset = i - mid;
      const angle = offset * angleStep;
      const x = offset * spacing;
      const y = Math.pow(offset / (mid || 1), 2) * 18;

      const el = document.createElement("div");
      el.className = "fan-card";
      el.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${angle}deg)`;
      el.style.zIndex = String(1000 - Math.abs(Math.round(offset)));

      const inner = document.createElement("div");
      inner.className = "fan-card-inner";

      const back = document.createElement("div");
      back.className = "fan-card-face back";
      const backImg = document.createElement("img");
      backImg.alt = "塔羅牌背";
      loadImageWithRetry(backImg, CARD_BACK_IMAGE);
      back.appendChild(backImg);

      // 正面圖片先不載入，等真的被抽到才載入，避免一次展開78張牌
      // 同時發出上百個圖片請求把瀏覽器/伺服器塞爆，導致偶發圖片出不來
      const front = document.createElement("div");
      front.className = "fan-card-face front";
      const frontImg = document.createElement("img");
      frontImg.alt = card.nameZh;
      front.appendChild(frontImg);

      inner.appendChild(back);
      inner.appendChild(front);
      el.appendChild(inner);

      el.addEventListener("click", () => drawCard(card, el, frontImg));

      fanAreaEl.appendChild(el);
    });
  }

  function drawCard(card, el, frontImg) {
    if (el.classList.contains("flipping") || drawnIds.has(card.id)) return;

    loadImageWithRetry(frontImg, card.image);
    el.classList.add("flipping");

    window.setTimeout(() => {
      el.classList.add("drawn");
      drawnIds.add(card.id);
      addDrawnCardTile(card);
      drawCountEl.textContent = String(drawnIds.size);

      if (remainingCards().length === 0) {
        deckHintEl.textContent = "牌已經抽完囉，點「重新開始」再洗一次牌";
        fanAreaEl.classList.add("hidden");
      }
    }, 650);
  }

  function addDrawnCardTile(card) {
    const tile = document.createElement("div");
    tile.className = "drawn-card";

    const img = document.createElement("img");
    img.alt = card.nameZh;
    loadImageWithRetry(img, card.image);

    const label = document.createElement("div");
    label.className = "card-label";
    label.textContent = card.nameZh;

    tile.appendChild(img);
    tile.appendChild(label);
    drawnCardsEl.appendChild(tile);
  }

  function shuffle() {
    deckStackEl.classList.add("shuffling");
    btnShuffle.disabled = true;

    window.setTimeout(() => {
      const kept = order.filter((c) => drawnIds.has(c.id));
      const rest = shuffledCopy(order.filter((c) => !drawnIds.has(c.id)));
      order = kept.concat(rest);

      deckStackEl.classList.remove("shuffling");
      btnShuffle.disabled = false;
      deckHintEl.textContent = "洗好了，點「攤牌選牌」抽牌吧";

      if (!fanAreaEl.classList.contains("hidden")) {
        renderFan();
      }
    }, 600);
  }

  function spread() {
    deckStackEl.classList.add("hidden");
    fanAreaEl.classList.remove("hidden");
    deckHintEl.textContent = "點一張牌把它抽出來";
    renderFan();
  }

  function reset() {
    order = shuffledCopy(fullDeck);
    drawnIds.clear();
    drawCountEl.textContent = "0";
    drawnCardsEl.innerHTML = "";
    fanAreaEl.classList.add("hidden");
    fanAreaEl.innerHTML = "";
    deckStackEl.classList.remove("hidden");
    deckHintEl.textContent = "請先洗牌，再點選「攤牌選牌」";
    renderStack();
  }

  btnShuffle.addEventListener("click", shuffle);
  btnSpread.addEventListener("click", spread);
  btnReset.addEventListener("click", reset);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (fanAreaEl.classList.contains("hidden")) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderFan, 150);
  });

  renderStack();
})();
