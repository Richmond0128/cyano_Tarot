// 完整手洗體驗版與快速版共用的小工具：洗牌演算法、圖片重試載入、扇形牌陣排版

function shuffledCopy(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

function createBackStackLayers(containerEl, layers) {
  containerEl.innerHTML = "";
  for (let i = 0; i < layers; i++) {
    const div = document.createElement("div");
    div.className = "stack-card";
    div.style.transform = `translate(${i * -1.2}px, ${i * -1.2}px)`;
    div.style.zIndex = String(layers - i);
    const img = document.createElement("img");
    img.alt = "塔羅牌背";
    loadImageWithRetry(img, CARD_BACK_IMAGE);
    div.appendChild(img);
    containerEl.appendChild(div);
  }
}

// 在 containerEl 裡把 cards 排成扇形（背面朝上），回傳 { el, card, frontImg } 的陣列
function renderFanLayout(containerEl, cards) {
  containerEl.innerHTML = "";
  const n = cards.length;
  if (n === 0) return [];

  const mid = (n - 1) / 2;
  const angleStep = Math.min(2.5, 160 / n);
  const containerWidth = containerEl.clientWidth || window.innerWidth;
  const maxSpacing = containerWidth < 500 ? 8 : 14;
  const spacing = Math.min(maxSpacing, (containerWidth * 0.92) / n);

  const entries = [];

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

    containerEl.appendChild(el);
    entries.push({ el, card, frontImg });
  });

  return entries;
}

// 建立一張「已抽出的牌」卡片，isReversed 為 true 時圖片會倒轉並標示逆位
function createDrawnTile(card, isReversed) {
  const tile = document.createElement("div");
  tile.className = "drawn-card" + (isReversed ? " reversed" : "");

  const img = document.createElement("img");
  img.alt = card.nameZh;
  img.className = "drawn-card-img";
  loadImageWithRetry(img, card.image);

  const label = document.createElement("div");
  label.className = "card-label";
  label.textContent = isReversed === undefined
    ? card.nameZh
    : `${card.nameZh}（${isReversed ? "逆位" : "正位"}）`;

  tile.appendChild(img);
  tile.appendChild(label);
  return tile;
}
