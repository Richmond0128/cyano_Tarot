// 金錢卦起卦：擲銅錢 → 本卦 → 動爻 → 之卦
// 資料表來自 iching-data.js（ICHING_HEXAGRAMS / getHexagramByBinary）
(function () {
  // 銅錢面值：字面(有文字)=陽=3，幕面(無文字)=陰=2（京房金錢卦慣例）
  // 如果網站用的銅錢圖正反面想反過來算，只要對調這兩個值
  const COIN_YANG_VALUE = 3;
  const COIN_YIN_VALUE = 2;

  const YAO_LABELS = ["初", "二", "三", "四", "五", "上"];

  function tossCoinFace() {
    return Math.random() < 0.5; // true = 字面(陽)，false = 幕面(陰)
  }

  // 一爻 = 擲3枚銅錢，記下每枚正反面＋加總：6老陰 7少陽 8少陰 9老陽
  function tossLine() {
    const faces = [tossCoinFace(), tossCoinFace(), tossCoinFace()];
    const value = faces.reduce((sum, yang) => sum + (yang ? COIN_YANG_VALUE : COIN_YIN_VALUE), 0);
    return { value, faces };
  }

  function isYang(value) {
    return value === 7 || value === 9;
  }

  function isChanging(value) {
    return value === 6 || value === 9;
  }

  // index 0 = 初爻（最下，最先擲）...index 5 = 上爻（最上，最後擲）
  function castLines() {
    const tosses = [];
    for (let i = 0; i < 6; i++) tosses.push(tossLine());
    return tosses;
  }

  // 開發測試用：問題欄位「只填一個數字0~6、沒有其他任何內容」時，強制擲出剛好N個動爻
  // （哪幾爻動、陰陽仍隨機）。有多打任何字都不算，當一般問題處理。
  function detectTestChangingCount(question) {
    const trimmed = (question || "").trim();
    if (!/^[0-6]$/.test(trimmed)) return null;
    return Number(trimmed);
  }

  // 從 0..size-1 隨機挑出 count 個索引
  function pickRandomIndices(size, count) {
    const positions = Array.from({ length: size }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    return new Set(positions.slice(0, count));
  }

  // 給定總分(6/7/8/9)，隨機配出一組3枚銅錢的正反面組合，讓擲幣動畫仍然看得出3枚錢的樣子
  function facesForValue(value) {
    if (value === 9) return [true, true, true];
    if (value === 6) return [false, false, false];
    const yangCount = value === 8 ? 2 : 1;
    const faces = [false, false, false];
    pickRandomIndices(3, yangCount).forEach((i) => {
      faces[i] = true;
    });
    return faces;
  }

  function castLinesWithChangingCount(count) {
    const changingSet = pickRandomIndices(6, count);
    const tosses = [];
    for (let i = 0; i < 6; i++) {
      const value = changingSet.has(i) ? (Math.random() < 0.5 ? 6 : 9) : Math.random() < 0.5 ? 7 : 8;
      tosses.push({ value, faces: facesForValue(value) });
    }
    return tosses;
  }

  // 逐爻投擲用：一次只決定一爻，但仍要讓6次下來動爻總數剛好等於 forcedCount
  // （序列式抽樣：第i爻是動爻的機率 = 剩下還要幾個動爻 / 剩下還有幾爻沒擲）
  function createChangingPlanner(forcedCount) {
    let remainingSlots = 6;
    let remainingNeeded = forcedCount;
    return function next() {
      const changing = Math.random() < remainingNeeded / remainingSlots;
      remainingSlots -= 1;
      if (changing) remainingNeeded -= 1;
      return changing;
    };
  }

  function tossLineForManual(planner) {
    if (!planner) return tossLine();
    const changing = planner();
    const value = changing ? (Math.random() < 0.5 ? 6 : 9) : Math.random() < 0.5 ? 7 : 8;
    return { value, faces: facesForValue(value) };
  }

  function binaryOf(lines, transform) {
    return lines
      .map((v) => {
        const yang = isYang(v);
        if (transform && isChanging(v)) return yang ? "0" : "1";
        return yang ? "1" : "0";
      })
      .join("");
  }

  // 依朱熹《易學啟蒙》考占法：依動爻數決定斷卦取哪段文字
  function judge(lines, changingIndices, originalHex, transformedHex) {
    const count = changingIndices.length;
    const unchanged = [0, 1, 2, 3, 4, 5].filter((i) => !changingIndices.includes(i));

    if (count === 0) {
      return { rule: "六爻皆不變：以本卦卦辭為斷", primary: { source: "本卦卦辭", text: originalHex.guaci } };
    }
    if (count === 1) {
      const idx = changingIndices[0];
      return {
        rule: "一爻變：以本卦變爻爻辭為斷",
        primary: { source: `本卦 ${originalHex.yao[idx].label}`, text: originalHex.yao[idx].text },
      };
    }
    if (count === 2) {
      const upperIdx = Math.max(...changingIndices);
      const lowerIdx = Math.min(...changingIndices);
      return {
        rule: "二爻變：以本卦兩動爻中較上一爻的爻辭為斷，下爻為輔助參考",
        primary: { source: `本卦 ${originalHex.yao[upperIdx].label}（主）`, text: originalHex.yao[upperIdx].text },
        secondary: { source: `本卦 ${originalHex.yao[lowerIdx].label}（輔）`, text: originalHex.yao[lowerIdx].text },
      };
    }
    if (count === 3) {
      return {
        rule: "三爻變：以本卦卦辭為主、之卦卦辭為輔",
        primary: { source: "本卦卦辭（貞）", text: originalHex.guaci },
        secondary: { source: "之卦卦辭（悔）", text: transformedHex.guaci },
      };
    }
    if (count === 4) {
      const lowerIdx = Math.min(...unchanged);
      const upperIdx = Math.max(...unchanged);
      return {
        rule: "四爻變：以之卦兩個不變爻中較下一爻的爻辭為斷，上爻為輔助參考",
        primary: { source: `之卦 ${transformedHex.yao[lowerIdx].label}（主）`, text: transformedHex.yao[lowerIdx].text },
        secondary: { source: `之卦 ${transformedHex.yao[upperIdx].label}（輔）`, text: transformedHex.yao[upperIdx].text },
      };
    }
    if (count === 5) {
      const idx = unchanged[0];
      return {
        rule: "五爻變：以之卦唯一不變爻的爻辭為斷",
        primary: { source: `之卦 ${transformedHex.yao[idx].label}`, text: transformedHex.yao[idx].text },
      };
    }

    // count === 6
    if (originalHex.binary === "111111") {
      return { rule: "六爻皆變，乾卦：以用九為斷", primary: { source: "本卦 用九", text: originalHex.yongjiu } };
    }
    if (originalHex.binary === "000000") {
      return { rule: "六爻皆變，坤卦：以用六為斷", primary: { source: "本卦 用六", text: originalHex.yongliu } };
    }
    return { rule: "六爻皆變：以之卦卦辭為斷", primary: { source: "之卦卦辭", text: transformedHex.guaci } };
  }

  // 給定已經擲好的6個toss（不管是自動一次擲完還是逐爻投擲收集來的），組出完整結果
  // method 只是記錄這次是用哪種起卦方式產生的，給AI解卦提示詞用
  function buildResult(question, tosses, method) {
    const lines = tosses.map((t) => t.value);
    const changingIndices = [];
    lines.forEach((v, i) => {
      if (isChanging(v)) changingIndices.push(i);
    });

    const originalHex = getHexagramByBinary(binaryOf(lines, false));
    const transformedHex = getHexagramByBinary(binaryOf(lines, true));

    return {
      question: question || "",
      time: new Date(),
      method: method || "auto",
      tosses,
      lines,
      changingIndices,
      hasChange: changingIndices.length > 0,
      original: originalHex,
      transformed: transformedHex,
      judgment: judge(lines, changingIndices, originalHex, transformedHex),
    };
  }

  function castHexagram(question) {
    const forcedCount = detectTestChangingCount(question || "");
    const tosses = forcedCount === null ? castLines() : castLinesWithChangingCount(forcedCount);
    return buildResult(question, tosses, "auto");
  }

  function lineSymbolLabel(value) {
    if (value === 6) return { yang: false, mark: "✕", name: "老陰" };
    if (value === 7) return { yang: true, mark: "", name: "少陽" };
    if (value === 8) return { yang: false, mark: "", name: "少陰" };
    return { yang: true, mark: "○", name: "老陽" }; // 9
  }

  window.IChing = { castHexagram, lineSymbolLabel, YAO_LABELS };

  // 天錢／地錢銅錢圖（見 assets/iching/coins/README.md）：
  // 兩款正面都是八卦面＝陽，背面不同＝陰。地錢(暗)白天用，天錢(亮)晚上用。
  const COIN_STYLES = {
    earth: {
      label: "地錢",
      front: "assets/iching/coins/地錢-正面-八卦-圓形去背.png",
      back: "assets/iching/coins/地錢-背面-十二生肖-圓形去背.png",
    },
    heaven: {
      label: "天錢",
      front: "assets/iching/coins/天錢-正面-八卦-圓形去背.png",
      back: "assets/iching/coins/天錢-背面-天師符-圓形去背.png",
    },
  };
  const OTHER_COIN_STYLE = { earth: "heaven", heaven: "earth" };

  function autoCoinStyle() {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6 ? "heaven" : "earth"; // 晚上用天錢，白天用地錢
  }

  // ---- DOM ----
  const formEl = document.getElementById("iching-form");
  if (!formEl) return; // 這個頁面沒有易經區塊時直接略過

  const questionInput = document.getElementById("iching-question");
  const resultEl = document.getElementById("iching-result");
  const manualSectionEl = document.getElementById("manual-cast-section");
  const btnCast = document.getElementById("btn-iching-cast");
  const btnQuickCast = document.getElementById("btn-iching-quick-cast");
  const coinStyleToggle = document.getElementById("coin-style-toggle");
  const coinStyleToggleIcon = document.getElementById("coin-style-toggle-icon");
  const coinStyleToggleLabel = document.getElementById("coin-style-toggle-label");

  // 預設自動依時間選好天錢/地錢，這顆按鈕只是低調的「想換也可以換」次要選項
  let currentCoinStyle = autoCoinStyle();

  if (coinStyleToggle) {
    function updateCoinStyleToggleUI() {
      const other = COIN_STYLES[OTHER_COIN_STYLE[currentCoinStyle]];
      coinStyleToggleIcon.src = COIN_STYLES[currentCoinStyle].front;
      coinStyleToggleLabel.textContent = `可切換至${other.label}`;
    }
    coinStyleToggle.addEventListener("click", () => {
      currentCoinStyle = OTHER_COIN_STYLE[currentCoinStyle];
      updateCoinStyleToggleUI();
    });
    updateCoinStyleToggleUI();
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function createEmptyRow(label) {
    const row = document.createElement("div");
    row.className = "yao-row";

    const labelEl = document.createElement("span");
    labelEl.className = "yao-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const original = document.createElement("span");
    original.className = "yao-line pending";
    original.textContent = "⋯";
    row.appendChild(original);

    const arrow = document.createElement("span");
    arrow.className = "yao-arrow";
    row.appendChild(arrow);

    const transformed = document.createElement("span");
    transformed.className = "yao-line pending";
    transformed.textContent = "⋯";
    row.appendChild(transformed);

    return row;
  }

  // 爻線圖示：陽爻畫成一條完整直線，陰爻畫成中間斷開的兩段——用CSS色塊畫，不要用字元湊
  function yaoBarHtml(yang, mark) {
    const bar = `<span class="yao-bar ${yang ? "yang" : "yin"}"></span>`;
    return bar + (mark ? ` <b class="yao-mark">${mark}</b>` : "");
  }

  // 第一階段：只亮出本卦這一爻，之卦欄位留著不動
  function fillOriginalCell(row, lineValue) {
    const info = lineSymbolLabel(lineValue);
    const originalCell = row.querySelectorAll(".yao-line")[0];
    originalCell.className = "yao-line " + (info.yang ? "yang" : "yin");
    originalCell.innerHTML = yaoBarHtml(info.yang, info.mark);
    row.classList.add("revealed");
  }

  // 第二階段：本卦六爻都出來之後，才補上之卦欄位（動爻才畫箭頭）
  function fillTransformedCell(row, lineValue, transformedYang) {
    row.querySelector(".yao-arrow").textContent = isChanging(lineValue) ? "→" : "";

    const transformedCell = row.querySelectorAll(".yao-line")[1];
    transformedCell.className =
      "yao-line fade-in " + (transformedYang ? "yang" : "yin") + (isChanging(lineValue) ? " changed" : " unchanged");
    transformedCell.innerHTML = yaoBarHtml(transformedYang, null);
  }

  // 3枚銅錢的擲卦動畫：先翻轉，停下來後亮出這一爻的正反面與陰陽
  function buildCoinTray() {
    const el = document.createElement("div");
    el.className = "coin-tray";

    const coinsRow = document.createElement("div");
    coinsRow.className = "coins-row";
    el.appendChild(coinsRow);

    const style = COIN_STYLES[currentCoinStyle] || COIN_STYLES.earth;
    const coins = [];
    for (let i = 0; i < 3; i++) {
      const coin = document.createElement("div");
      coin.className = "coin";
      coin.innerHTML = `
        <img class="coin-face front" src="${style.front}" alt="陽面（八卦）">
        <img class="coin-face back" src="${style.back}" alt="陰面">
      `;
      coins.push(coin);
      coinsRow.appendChild(coin);
    }

    const label = document.createElement("p");
    label.className = "toss-label";
    label.textContent = "準備起卦…";
    el.appendChild(label);

    function flip(toss) {
      return new Promise((resolve) => {
        coins.forEach((coin) => {
          coin.style.transform = "";
          coin.classList.add("spinning");
        });
        label.textContent = "擲銅錢…";

        window.setTimeout(() => {
          coins.forEach((coin, idx) => {
            coin.classList.remove("spinning");
            coin.style.transform = toss.faces[idx] ? "rotateY(0deg)" : "rotateY(180deg)";
          });
          const info = lineSymbolLabel(toss.value);
          label.textContent = `${toss.value}（${info.name}）`;
          window.setTimeout(resolve, 280);
        }, 650);
      });
    }

    return { el, flip };
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
    window.requestAnimationFrame(() => overlay.classList.add("open"));

    return { overlay, close };
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "iching-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    window.requestAnimationFrame(() => toast.classList.add("show"));
    window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  // 「卦象正在形成…」列表的一列：未擲時 value 傳 null
  function createFormingRow(label, value) {
    const row = document.createElement("div");
    row.className = "forming-row";

    const labelEl = document.createElement("span");
    labelEl.className = "forming-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const iconEl = document.createElement("span");
    iconEl.className = "forming-icon";
    row.appendChild(iconEl);

    const stateEl = document.createElement("span");
    stateEl.className = "forming-state";
    row.appendChild(stateEl);

    row._iconEl = iconEl;
    row._stateEl = stateEl;
    updateFormingRow(row, value);
    return row;
  }

  function updateFormingRow(row, value) {
    const iconEl = row._iconEl;
    const stateEl = row._stateEl;

    if (value === null) {
      iconEl.innerHTML = "";
      iconEl.className = "forming-icon";
      stateEl.textContent = "未擲";
      stateEl.className = "forming-state unrevealed";
      return;
    }

    const info = lineSymbolLabel(value);
    const colorCls = info.yang ? "yang" : "yin";
    const changing = isChanging(value);

    iconEl.innerHTML = yaoBarHtml(info.yang, info.mark);
    iconEl.className = "forming-icon " + colorCls;

    stateEl.innerHTML = info.name + (changing ? ' <span class="forming-badge">動</span>' : "");
    stateEl.className = "forming-state " + colorCls + (changing ? " changing" : "");
  }

  function renderHexagramText(title, hex, highlightIndices) {
    const wrap = document.createElement("div");
    wrap.className = "gua-text-block fade-in";

    const h = document.createElement("h3");
    h.textContent = `${title}：${hex.number}．${hex.name}（${hex.fullName}）`;
    wrap.appendChild(h);

    const guaci = document.createElement("p");
    guaci.className = "gua-ci";
    guaci.textContent = "卦辭：" + hex.guaci;
    wrap.appendChild(guaci);

    if (hex.daxiang) {
      const daxiang = document.createElement("p");
      daxiang.className = "gua-xiang";
      daxiang.textContent = "象曰：" + hex.daxiang;
      wrap.appendChild(daxiang);
    }

    const list = document.createElement("ul");
    list.className = "yao-ci-list";
    hex.yao.forEach((y, i) => {
      const li = document.createElement("li");
      if (highlightIndices && highlightIndices.includes(i)) li.className = "changing";

      const main = document.createElement("div");
      main.className = "yao-ci-main";
      main.textContent = `${y.label}：${y.text}`;
      li.appendChild(main);

      if (y.xiang) {
        const xiang = document.createElement("div");
        xiang.className = "yao-ci-xiang";
        xiang.textContent = "象：" + y.xiang;
        li.appendChild(xiang);
      }

      list.appendChild(li);
    });
    wrap.appendChild(list);

    if (hex.yongjiu || hex.yongliu) {
      const extra = document.createElement("p");
      extra.className = "gua-ci";
      extra.textContent = hex.yongjiu ? "用九：" + hex.yongjiu : "用六：" + hex.yongliu;
      wrap.appendChild(extra);

      const extraXiangText = hex.yongjiuXiang || hex.yongliuXiang;
      if (extraXiangText) {
        const extraXiang = document.createElement("p");
        extraXiang.className = "gua-xiang";
        extraXiang.textContent = "象：" + extraXiangText;
        wrap.appendChild(extraXiang);
      }
    }

    return wrap;
  }

  function renderJudgmentAndTexts(result) {
    const judgment = document.createElement("div");
    judgment.className = "iching-judgment fade-in";

    const ruleP = document.createElement("p");
    ruleP.className = "judgment-rule";
    ruleP.textContent = result.judgment.rule;
    judgment.appendChild(ruleP);

    function appendJudgmentLine(entry) {
      const p = document.createElement("p");
      p.className = "judgment-text";
      const source = document.createElement("span");
      source.className = "judgment-source";
      source.textContent = entry.source;
      p.appendChild(source);
      p.appendChild(document.createTextNode("　" + entry.text));
      judgment.appendChild(p);
    }

    appendJudgmentLine(result.judgment.primary);
    if (result.judgment.secondary) appendJudgmentLine(result.judgment.secondary);

    resultEl.appendChild(judgment);
    resultEl.appendChild(renderHexagramText("本卦", result.original, result.changingIndices));
    if (result.hasChange) {
      resultEl.appendChild(renderHexagramText("之卦", result.transformed));
    }

    resultEl.appendChild(buildAiPromptButton(result));
  }

  const CAST_METHOD_LABEL = { auto: "一鍵搖卦", manual: "逐爻投擲" };

  function buildAiPromptText(result) {
    const sixLines = result.lines
      .map((v, i) => {
        const info = lineSymbolLabel(v);
        return `${YAO_LABELS[i]}爻 ${info.name}${isChanging(v) ? "(動)" : ""}`;
      })
      .join("／");

    let text = "【起卦資訊】\n";
    text += `占卜問題：${result.question || "（未填寫）"}\n`;
    text += `起卦方式：${CAST_METHOD_LABEL[result.method] || CAST_METHOD_LABEL.auto}\n`;
    text += `起卦時間：${result.time.toLocaleString("zh-TW")}\n`;
    text += `本卦：${result.original.number}．${result.original.name}（${result.original.fullName}）\n`;
    text += `六爻（由下而上）：${sixLines}\n`;
    text += `動爻數：${result.changingIndices.length}爻變\n`;
    if (result.hasChange) {
      text += `變卦：${result.transformed.number}．${result.transformed.name}\n`;
    }

    text += "\n【卦辭與爻辭原文】\n";
    text += `本卦卦辭：${result.original.guaci}\n`;
    if (result.hasChange) {
      const changingYaoText = result.changingIndices
        .map((idx) => `${result.original.yao[idx].label}：${result.original.yao[idx].text}`)
        .join("\n");
      text += `各動爻之爻辭：\n${changingYaoText}\n`;
    }
    if (result.changingIndices.length >= 3) {
      text += `變卦卦辭：${result.transformed.guaci}\n`;
    }

    text += "\n【斷卦依據規則，請嚴格依此判斷要引用哪一段原文】\n";
    text += "- 0爻變（不動）：以本卦卦辭為斷\n";
    text += "- 1爻變：以該動爻之爻辭為斷\n";
    text += "- 2爻變：以兩個動爻中「上面那一爻」之爻辭為斷，另一爻為輔助參考\n";
    text += "- 3爻變：以本卦卦辭為主、變卦卦辭為輔（本卦代表現況，變卦代表發展方向）\n";
    text += "- 4爻變：以變卦中「兩個不動爻裡位置較低那一爻」之爻辭為斷\n";
    text += "- 5爻變：以變卦中唯一不動的那一爻之爻辭為斷\n";
    text += "- 6爻變：以變卦卦辭為斷（乾卦六爻皆變用用九、坤卦六爻皆變用用六）\n";

    text += "\n【回答格式，請依序輸出】\n";
    text += "1. 結論：先根據卦辭/爻辭與占卜問題做推論，再直接給出推論後的結論（不要預設一定要講吉凶或成敗，結論的方向由推論結果自然決定）\n";
    text += "2. 依據：說明你引用的是上面規則裡的哪一條、對應卦名與爻位，附上原文\n";
    text += "3. 解讀：用白話說明這段原文跟使用者問題的關聯\n";
    text += "4. 建議：給出具體可行的建議或提醒\n";
    text += "5. 若問題資訊不足、或卦象本身有矛盾之處，請在最後註明，不要硬掰\n";

    text += "\n【限制】\n";
    text += "僅根據《周易》卦辭、爻辭、象傳原文作依據，不要編造典籍沒有的內容；不要使用危言聳聽、恐嚇式的語氣。";

    return text;
  }

  function buildAiPromptButton(result) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn tool-btn-secondary ai-prompt-btn";
    btn.textContent = "AI解卦提示詞";
    btn.addEventListener("click", () => openAiPromptSheet(buildAiPromptText(result)));
    return btn;
  }

  function openAiPromptSheet(promptText) {
    const content = document.createElement("div");
    content.className = "sheet-content ai-prompt-sheet";

    const title = document.createElement("h3");
    title.className = "sheet-title";
    title.textContent = "AI解卦提示詞";
    content.appendChild(title);

    const preview = document.createElement("textarea");
    preview.className = "ai-prompt-preview";
    preview.readOnly = true;
    preview.value = promptText;
    content.appendChild(preview);

    const actions = document.createElement("div");
    actions.className = "ai-prompt-actions";
    content.appendChild(actions);

    function addActionButton(label, secondary, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tool-btn" + (secondary ? " tool-btn-secondary" : "");
      btn.textContent = label;
      btn.addEventListener("click", onClick);
      actions.appendChild(btn);
      return btn;
    }

    addActionButton("複製", false, async () => {
      try {
        await navigator.clipboard.writeText(preview.value);
        showToast("已複製，請前往 ChatGPT／DeepSeek 等工具貼上提問");
      } catch (e) {
        showToast("複製失敗，請手動選取文字");
      }
    });

    addActionButton("分享", true, async () => {
      if (navigator.share) {
        try {
          await navigator.share({ text: preview.value });
        } catch (e) {
          // 使用者自己取消分享，不用額外提示
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(preview.value);
        showToast("此瀏覽器不支援分享，已改為複製");
      } catch (e) {
        showToast("此瀏覽器不支援分享");
      }
    });

    addActionButton("儲存為文字", true, () => {
      const blob = new Blob([preview.value], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AI解卦提示詞.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    openSheet(content);
  }

  async function castAndAnimate(question) {
    btnCast.disabled = true;
    if (btnQuickCast) btnQuickCast.disabled = true;
    if (manualSectionEl) manualSectionEl.classList.add("hidden");

    const result = castHexagram(question);

    resultEl.innerHTML = "";
    resultEl.classList.remove("hidden");

    const summary = document.createElement("div");
    summary.className = "iching-summary";

    const qP = document.createElement("p");
    qP.className = "iching-question";
    qP.textContent = "問題：" + (result.question || "（未填寫）");
    summary.appendChild(qP);

    const tP = document.createElement("p");
    tP.className = "iching-time";
    tP.textContent = "時間：" + result.time.toLocaleString("zh-TW");
    summary.appendChild(tP);

    const titleEl = document.createElement("h2");
    titleEl.className = "iching-title pending";
    titleEl.textContent = "靜心擲卦中…";
    summary.appendChild(titleEl);

    const stageEl = document.createElement("div");
    stageEl.className = "iching-stage";
    summary.appendChild(stageEl);

    resultEl.appendChild(summary);

    const tray = buildCoinTray();
    resultEl.appendChild(tray.el);

    const table = document.createElement("div");
    table.className = "yao-table";
    const header = document.createElement("div");
    header.className = "yao-row yao-row-header";
    const headerLabel = document.createElement("span");
    headerLabel.className = "yao-label";
    header.appendChild(headerLabel);
    const headerOriginal = document.createElement("span");
    headerOriginal.className = "yao-line";
    headerOriginal.textContent = "本卦";
    header.appendChild(headerOriginal);
    const headerArrow = document.createElement("span");
    headerArrow.className = "yao-arrow";
    header.appendChild(headerArrow);
    const headerTransformed = document.createElement("span");
    headerTransformed.className = "yao-line";
    headerTransformed.textContent = "之卦";
    header.appendChild(headerTransformed);
    table.appendChild(header);

    const rows = [];
    for (let i = 5; i >= 0; i--) {
      const row = createEmptyRow(YAO_LABELS[i] + "爻");
      rows[i] = row;
      table.appendChild(row);
    }
    resultEl.appendChild(table);

    // 第一階段：只擲本卦六爻，一爻一爻來
    for (let i = 0; i < 6; i++) {
      await tray.flip(result.tosses[i]);
      fillOriginalCell(rows[i], result.lines[i]);
      await delay(200);
    }

    tray.el.classList.add("fading");
    await delay(350);
    tray.el.remove();

    titleEl.classList.remove("pending");
    titleEl.classList.add("pop-in");
    headerOriginal.textContent = `本卦 ${result.original.number}．${result.original.name}`;

    if (!result.hasChange) {
      titleEl.textContent = `本卦：${result.original.number}．${result.original.name}`;
      const note = document.createElement("p");
      note.className = "iching-no-change fade-in";
      note.textContent = "六爻不變";
      stageEl.appendChild(note);
    } else {
      // 動爻位置用傳統爻位名稱標示，例如「九二」「六三」
      const changingLabels = result.changingIndices.map((idx) => result.original.yao[idx].label).join("、");
      titleEl.textContent = `本卦：${result.original.number}．${result.original.name}（${changingLabels}）`;

      await delay(550);

      // 第二階段：本卦整卦出來後，才跳之卦——把每一爻的之卦欄位補上
      for (let i = 0; i < 6; i++) {
        fillTransformedCell(rows[i], result.lines[i], result.transformed.binary[i] === "1");
        await delay(120);
      }

      headerTransformed.textContent = `之卦 ${result.transformed.number}．${result.transformed.name}`;

      await delay(250);
      const transformedTitle = document.createElement("h2");
      transformedTitle.className = "iching-title transformed pop-in";
      transformedTitle.textContent = `之卦：${result.transformed.number}．${result.transformed.name}`;
      stageEl.appendChild(transformedTitle);
    }

    renderJudgmentAndTexts(result);

    btnCast.disabled = false;
    if (btnQuickCast) btnQuickCast.disabled = false;
  }

  // 逐爻投擲走完之後按「查看詳情」：這時候6爻都已經知道了，直接整頁顯示、不用再動畫一次
  function showInstantResult(result) {
    resultEl.innerHTML = "";
    resultEl.classList.remove("hidden");

    const summary = document.createElement("div");
    summary.className = "iching-summary";

    const qP = document.createElement("p");
    qP.className = "iching-question";
    qP.textContent = "問題：" + (result.question || "（未填寫）");
    summary.appendChild(qP);

    const tP = document.createElement("p");
    tP.className = "iching-time";
    tP.textContent = "時間：" + result.time.toLocaleString("zh-TW");
    summary.appendChild(tP);

    const titleEl = document.createElement("h2");
    titleEl.className = "iching-title pop-in";
    if (result.hasChange) {
      const changingLabels = result.changingIndices.map((idx) => result.original.yao[idx].label).join("、");
      titleEl.textContent = `本卦：${result.original.number}．${result.original.name}（${changingLabels}）`;
    } else {
      titleEl.textContent = `本卦：${result.original.number}．${result.original.name}`;
    }
    summary.appendChild(titleEl);

    const stageEl = document.createElement("div");
    stageEl.className = "iching-stage";
    if (!result.hasChange) {
      const note = document.createElement("p");
      note.className = "iching-no-change";
      note.textContent = "六爻不變";
      stageEl.appendChild(note);
    } else {
      const transformedTitle = document.createElement("h2");
      transformedTitle.className = "iching-title transformed";
      transformedTitle.textContent = `之卦：${result.transformed.number}．${result.transformed.name}`;
      stageEl.appendChild(transformedTitle);
    }
    summary.appendChild(stageEl);

    resultEl.appendChild(summary);

    const table = document.createElement("div");
    table.className = "yao-table";
    const header = document.createElement("div");
    header.className = "yao-row yao-row-header";
    const headerLabel = document.createElement("span");
    headerLabel.className = "yao-label";
    header.appendChild(headerLabel);
    const headerOriginal = document.createElement("span");
    headerOriginal.className = "yao-line";
    headerOriginal.textContent = `本卦 ${result.original.number}．${result.original.name}`;
    header.appendChild(headerOriginal);
    const headerArrow = document.createElement("span");
    headerArrow.className = "yao-arrow";
    header.appendChild(headerArrow);
    const headerTransformed = document.createElement("span");
    headerTransformed.className = "yao-line";
    headerTransformed.textContent = result.hasChange ? `之卦 ${result.transformed.number}．${result.transformed.name}` : "之卦";
    header.appendChild(headerTransformed);
    table.appendChild(header);

    for (let i = 5; i >= 0; i--) {
      const row = createEmptyRow(YAO_LABELS[i] + "爻");
      fillOriginalCell(row, result.lines[i]);
      if (result.hasChange) {
        fillTransformedCell(row, result.lines[i], result.transformed.binary[i] === "1");
      }
      table.appendChild(row);
    }
    resultEl.appendChild(table);

    renderJudgmentAndTexts(result);
  }

  // ---- 逐爻投擲：一次一爻，按一下「第N次投擲」才擲那一爻 ----
  function startManualCasting(question) {
    resultEl.classList.add("hidden");
    manualSectionEl.innerHTML = "";
    manualSectionEl.classList.remove("hidden");

    const forcedCount = detectTestChangingCount(question || "");
    const planner = forcedCount === null ? null : createChangingPlanner(forcedCount);
    const tosses = [];

    const qP = document.createElement("p");
    qP.className = "iching-question";
    qP.textContent = "問題：" + (question || "（未填寫）");
    manualSectionEl.appendChild(qP);

    const tray = buildCoinTray();
    manualSectionEl.appendChild(tray.el);

    const tossBtn = document.createElement("button");
    tossBtn.type = "button";
    tossBtn.className = "tool-btn";
    tossBtn.textContent = "第1次投擲";
    manualSectionEl.appendChild(tossBtn);

    const formingWrap = document.createElement("div");
    formingWrap.className = "forming-list";

    const formingTitle = document.createElement("p");
    formingTitle.className = "forming-title";
    formingTitle.textContent = "卦象正在形成…";
    formingWrap.appendChild(formingTitle);

    const formingRows = [];
    for (let i = 5; i >= 0; i--) {
      const row = createFormingRow(YAO_LABELS[i] + "爻", null);
      formingRows[i] = row;
      formingWrap.appendChild(row);
    }
    manualSectionEl.appendChild(formingWrap);

    tossBtn.addEventListener("click", async () => {
      tossBtn.disabled = true; // 投擲動畫播放中不能按，播完才又能按（或結束流程）

      const toss = tossLineForManual(planner);
      tosses.push(toss);
      const idx = tosses.length - 1;

      await tray.flip(toss);
      updateFormingRow(formingRows[idx], toss.value);

      if (tosses.length < 6) {
        tossBtn.textContent = `第${tosses.length + 1}次投擲`;
        tossBtn.disabled = false;
      } else {
        tray.el.classList.add("fading");
        await delay(300);
        tray.el.remove();
        tossBtn.remove();
        showManualResultCard(question, tosses);
      }
    });
  }

  function showManualResultCard(question, tosses) {
    const result = buildResult(question, tosses, "manual");

    const card = document.createElement("div");
    card.className = "manual-result-card fade-in";

    const h = document.createElement("h3");
    h.className = "iching-title";
    h.textContent = `您的卦象：${result.original.number}．${result.original.name}`;
    card.appendChild(h);

    const list = document.createElement("div");
    list.className = "forming-list";
    for (let i = 5; i >= 0; i--) {
      list.appendChild(createFormingRow(YAO_LABELS[i] + "爻", result.lines[i]));
    }
    card.appendChild(list);

    const coinsRow = document.createElement("div");
    coinsRow.className = "coins-row manual-result-coins";
    const style = COIN_STYLES[currentCoinStyle] || COIN_STYLES.earth;
    tosses[tosses.length - 1].faces.forEach((yang) => {
      const img = document.createElement("img");
      img.className = "coin-thumb";
      img.src = yang ? style.front : style.back;
      img.alt = yang ? "陽面" : "陰面";
      coinsRow.appendChild(img);
    });
    card.appendChild(coinsRow);

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "tool-btn";
    viewBtn.textContent = "查看詳情";
    viewBtn.addEventListener("click", () => {
      manualSectionEl.classList.add("hidden");
      showInstantResult(result);
    });
    card.appendChild(viewBtn);

    manualSectionEl.appendChild(card);
  }

  // ---- 起卦方式選擇（開始起卦按下去先跳這個，快速取卦不用） ----
  function openCastMethodSheet(question) {
    const content = document.createElement("div");
    content.className = "sheet-content cast-method-sheet";

    const title = document.createElement("h3");
    title.className = "sheet-title";
    title.textContent = "選擇起卦方式";
    content.appendChild(title);

    function addMethodOption(icon, name, desc, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cast-method-option";
      btn.innerHTML = `
        <span class="cast-method-icon">${icon}</span>
        <span class="cast-method-text">
          <span class="cast-method-name">${name}</span>
          <span class="cast-method-desc">${desc}</span>
        </span>
      `;
      btn.addEventListener("click", onClick);
      content.appendChild(btn);
    }

    addMethodOption("⚡", "一鍵搖卦", "快速生成卦象", () => {
      sheet.close();
      castAndAnimate(question);
    });
    addMethodOption("🤚", "逐爻投擲", "傳統方式，更有儀式感", () => {
      sheet.close();
      startManualCasting(question);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "sheet-cancel";
    cancelBtn.textContent = "取消";
    cancelBtn.addEventListener("click", () => sheet.close());
    content.appendChild(cancelBtn);

    const sheet = openSheet(content);
  }

  btnCast.addEventListener("click", () => {
    openCastMethodSheet(questionInput.value.trim());
  });

  if (btnQuickCast) {
    btnQuickCast.addEventListener("click", () => {
      castAndAnimate(""); // 快速取卦：不管問題欄位寫什麼，就是不用填問題也能起卦
    });
  }
})();
