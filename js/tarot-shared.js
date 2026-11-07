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

// 瀏覽器預設會讓使用者把 <img> 整張拖走（拖曳時出現一張圖片殘影跟著游標），
// 手搓洗牌需要自己接管拖曳手勢，所以每張卡片圖都要關掉這個原生行為
function makeImageNonDraggable(img) {
  img.draggable = false;
  img.addEventListener("dragstart", (e) => e.preventDefault());
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
    makeImageNonDraggable(img);
    loadImageWithRetry(img, CARD_BACK_IMAGE);
    div.appendChild(img);
    containerEl.appendChild(div);
  }
}

// 在 containerEl 裡把 cards 排成扇形（背面朝上），回傳 { el, card, frontImg } 的陣列。
// animate 為 true 時，牌會從收合狀態依序（由左到右錯開一點點時間）展開成扇形，
// 模擬像摺扇一樣慢慢推開的效果；resize 之類的重新排版則不需要再演一次展開動畫。
function renderFanLayout(containerEl, cards, animate) {
  containerEl.innerHTML = "";
  const n = cards.length;
  if (n === 0) return [];

  const mid = (n - 1) / 2;
  const angleStep = Math.min(0.9, 70 / n); // 牌與牌之間的旋轉角度，放緩一點，選牌時比較不會眼花
  const containerWidth = containerEl.clientWidth || window.innerWidth;
  const cardWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-w")) || 90;
  const cardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-h")) || 153;
  const maxSpacing = containerWidth < 500 ? 5 : 9;
  // 扇形總寬度（卡片寬度 + 牌與牌的間距總和）要留在容器內，才不會讓頁面出現橫向捲軸；
  // 邊緣那幾張牌因為有旋轉角度，實際佔的寬度比卡片本身寬（旋轉後的外接矩形），
  // 所以這裡要連旋轉角度一起算進可用寬度，不然邊緣的牌會被撐出容器外。
  // 牌是繞「底部中心」旋轉的（.fan-card 的 transform-origin），不是繞卡片正中心，
  // 所以旋轉後往外凸出的量是 半張牌寬*cos + 整張牌高*sin，高度要算全長而不是一半
  const maxEdgeAngleRad = (mid * angleStep * Math.PI) / 180;
  const edgeBoundingHalfWidth =
    (cardWidth / 2) * Math.cos(maxEdgeAngleRad) + cardHeight * Math.sin(maxEdgeAngleRad);
  // 乘0.96留一點安全margin，蓋掉次像素捨入誤差，不要讓邊緣牌剛好卡在容器邊界上
  const availableHalfWidth = (containerWidth / 2 - edgeBoundingHalfWidth) * 0.96;
  const spacing = Math.min(maxSpacing, Math.max(2, availableHalfWidth / Math.max(1, mid)));
  // 整條牌還是橫向排列（左到右），但底線改成一個緩緩的S彎，不是死板的直線，
  // 也不是左右對稱隆起的弧形——一端略高、一端略低，中間平滑過渡；振幅放緩一點
  const waveAmplitude = containerWidth < 500 ? 14 : 24;

  const entries = [];

  cards.forEach((card, i) => {
    const offset = i - mid;
    const angle = offset * angleStep;
    const x = offset * spacing;
    const wavePhase = mid > 0 ? (offset / mid) * (Math.PI / 2) : 0;
    const y = waveAmplitude * Math.sin(wavePhase);
    const finalTransform = `translateX(${x}px) translateY(${y}px) rotate(${angle}deg)`;

    const el = document.createElement("div");
    el.className = "fan-card";
    // 開扇是從左到右把牌推出來，所以越右邊的牌疊得越上面（最後推出的那張在最上層）
    const baseZIndex = i + 1;
    el.style.zIndex = String(baseZIndex);

    if (animate) {
      el.style.transform = "translateX(0px) translateY(0px) rotate(0deg)";
      el.style.transition = "transform 0.32s cubic-bezier(.2,.7,.3,1)";
      el.style.transitionDelay = `${Math.min(i, 60) * 4}ms`;
      // 用 setTimeout 而不是 requestAnimationFrame 來觸發展開：分頁被切到背景、
      // 畫面沒有在重繪時，rAF 可能完全不會執行，牌就會卡在收合狀態動不了
      window.setTimeout(() => {
        el.style.transform = finalTransform;
      }, 20);
    } else {
      el.style.transform = finalTransform;
    }

    const inner = document.createElement("div");
    inner.className = "fan-card-inner";

    const back = document.createElement("div");
    back.className = "fan-card-face back";
    const backImg = document.createElement("img");
    backImg.alt = "塔羅牌背";
    makeImageNonDraggable(backImg);
    loadImageWithRetry(backImg, CARD_BACK_IMAGE);
    back.appendChild(backImg);

    // 正面圖片先不載入，等真的被抽到才載入，避免一次展開78張牌
    // 同時發出上百個圖片請求把瀏覽器/伺服器塞爆，導致偶發圖片出不來
    const front = document.createElement("div");
    front.className = "fan-card-face front";
    const frontImg = document.createElement("img");
    frontImg.alt = card.nameZh;
    makeImageNonDraggable(frontImg);
    front.appendChild(frontImg);

    inner.appendChild(back);
    inner.appendChild(front);
    el.appendChild(inner);

    containerEl.appendChild(el);
    entries.push({ el, card, frontImg, baseTransform: finalTransform, baseZIndex });
  });

  return entries;
}

// 幫扇形牌陣加上「滑過會凸起、往上一撥就抽出」的手勢，桌面滑鼠跟手機觸控都適用。
// 單純點一下（沒什麼位移）還是會直接抽牌，維持原本最簡單的操作方式。
// 只需要在容器建立時呼叫一次；每次重新攤牌時呼叫 getEntries() 都會拿到最新那組卡片，
// 不用每次攤牌都重新綁一次事件（不然監聽器會越疊越多）。
function attachFanGestures(containerEl, getEntries, onDraw) {
  const BULGE_LIFT = "translateY(-16px) scale(1.05)";
  const SWIPE_UP_THRESHOLD = 34;
  const TAP_MOVE_TOLERANCE = 12;

  let active = null; // entry 目前被手指/滑鼠蓋住、凸起的那張
  let startX = 0;
  let startY = 0;
  let maxMoveDist = 0;

  function findEntryAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const cardEl = el && el.closest ? el.closest(".fan-card") : null;
    if (!cardEl) return null;
    return getEntries().find((en) => en.el === cardEl) || null;
  }

  function setActive(entry) {
    if (active === entry) return;
    if (active) {
      active.el.style.zIndex = String(active.baseZIndex);
      active.el.style.transform = active.baseTransform;
    }
    active = entry;
    if (active) {
      // 開扇展開動畫會在每張牌的 transition 上留下不同的 delay，蓋過去才不會讓
      // 凸起的反應跟著那個殘留的 delay 慢半拍
      active.el.style.transition = "transform 0.15s ease";
      active.el.style.transitionDelay = "0ms";
      active.el.style.zIndex = "5000";
      active.el.style.transform = active.baseTransform + " " + BULGE_LIFT;
    }
  }

  function commitDraw(entry) {
    setActive(null);
    onDraw(entry.card, entry.el, entry.frontImg);
  }

  containerEl.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    maxMoveDist = 0;
    setActive(findEntryAt(e.clientX, e.clientY));
  });

  containerEl.addEventListener("pointermove", (e) => {
    if (!active && e.buttons === 0) return; // 沒按著就滑過去不用反應，省得整排一直在跳
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
    maxMoveDist = Math.max(maxMoveDist, dist);

    const entry = findEntryAt(e.clientX, e.clientY);
    if (entry !== active) {
      setActive(entry);
      // 換了一張牌就重新算這張牌自己的上滑距離，不然會沿用剛剛那張牌已經
      // 累積到的上滑量，手指還沒往上動就把新的牌也一起判定成「上滑抽出」
      startX = e.clientX;
      startY = e.clientY;
      return;
    }
    if (active) {
      const upDist = startY - e.clientY;
      if (upDist > SWIPE_UP_THRESHOLD) {
        commitDraw(active);
      }
    }
  });

  function onRelease(e) {
    if (!active) return;
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (Math.max(dist, maxMoveDist) <= TAP_MOVE_TOLERANCE) {
      // 幾乎沒有移動，當成單純點一下，直接抽牌
      commitDraw(active);
    } else {
      setActive(null);
    }
  }

  containerEl.addEventListener("pointerup", onRelease);
  containerEl.addEventListener("pointercancel", () => setActive(null));
}

// 通用的底部彈出面板：蓋版 + 面板，點蓋版可關閉
function openSheet(contentEl) {
  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";

  const panel = document.createElement("div");
  panel.className = "sheet-panel";
  panel.appendChild(contentEl);
  overlay.appendChild(panel);

  function close() {
    overlay.classList.remove("open");
    window.setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
  window.setTimeout(() => overlay.classList.add("open"), 20);

  return { overlay, close };
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "iching-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.classList.add("show"), 20);
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 300);
  }, 2400);
}

// 純圖示按鈕（洗牌/整牌/切牌/開扇/重新開始…）沒有文字，桌面滑鼠移過去時
// title 屬性會跳出瀏覽器原生的提示文字；手機沒有「移過去」這件事，所以改成
// 長按才顯示文字說明，而且長按不應該順便觸發按鈕本身的動作——短按/輕點還是照常觸發。
function attachLongPressTooltip(btn) {
  const label = btn.getAttribute("title") || btn.getAttribute("aria-label");
  if (!label) return;

  const LONG_PRESS_MS = 480;
  let timer = null;
  let longPressed = false;
  let tooltipEl = null;

  function showTooltip() {
    longPressed = true;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "icon-btn-tooltip";
    tooltipEl.textContent = label;
    document.body.appendChild(tooltipEl);
    const rect = btn.getBoundingClientRect();
    tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
    tooltipEl.style.top = `${rect.top - 8}px`;
    window.setTimeout(() => {
      if (tooltipEl) tooltipEl.classList.add("show");
    }, 10);
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    const el = tooltipEl;
    tooltipEl = null;
    el.classList.remove("show");
    window.setTimeout(() => el.remove(), 150);
  }

  btn.addEventListener(
    "touchstart",
    () => {
      longPressed = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(showTooltip, LONG_PRESS_MS);
    },
    { passive: true }
  );

  btn.addEventListener(
    "touchmove",
    () => {
      window.clearTimeout(timer);
    },
    { passive: true }
  );

  btn.addEventListener("touchend", (e) => {
    window.clearTimeout(timer);
    if (longPressed) {
      e.preventDefault(); // 擋掉長按放開後緊接著補上的那個 click，避免又順便觸發按鈕動作
      window.setTimeout(hideTooltip, 900);
    }
  });

  btn.addEventListener("touchcancel", () => {
    window.clearTimeout(timer);
    hideTooltip();
  });

  // 以防某些瀏覽器 touchend 的 preventDefault 沒能擋下 click，這裡用捕獲階段再擋一次，
  // 搶在按鈕自己的 click 處理函式（例如觸發洗牌）之前執行
  btn.addEventListener(
    "click",
    (e) => {
      if (longPressed) {
        e.preventDefault();
        e.stopImmediatePropagation();
        longPressed = false;
      }
    },
    true
  );
}

// 建立一張「已抽出的牌」卡片，isReversed 為 true 時圖片會倒轉並標示逆位
function createDrawnTile(card, isReversed) {
  const tile = document.createElement("div");
  tile.className = "drawn-card" + (isReversed ? " reversed" : "");

  const img = document.createElement("img");
  img.alt = card.nameZh;
  img.className = "drawn-card-img";
  makeImageNonDraggable(img);
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
