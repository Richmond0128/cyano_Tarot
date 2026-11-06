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
      const idx = Math.max(...changingIndices);
      return {
        rule: "二爻變：以本卦兩動爻中較上一爻的爻辭為斷",
        primary: { source: `本卦 ${originalHex.yao[idx].label}`, text: originalHex.yao[idx].text },
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
      const idx = Math.min(...unchanged);
      return {
        rule: "四爻變：以之卦兩個不變爻中較下一爻的爻辭為斷",
        primary: { source: `之卦 ${transformedHex.yao[idx].label}`, text: transformedHex.yao[idx].text },
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

  function castHexagram(question) {
    const tosses = castLines();
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
      tosses,
      lines,
      changingIndices,
      hasChange: changingIndices.length > 0,
      original: originalHex,
      transformed: transformedHex,
      judgment: judge(lines, changingIndices, originalHex, transformedHex),
    };
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
  const btnCast = document.getElementById("btn-iching-cast");
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

  // 第一階段：只亮出本卦這一爻，之卦欄位留著不動
  function fillOriginalCell(row, lineValue) {
    const info = lineSymbolLabel(lineValue);
    const originalCell = row.querySelectorAll(".yao-line")[0];
    originalCell.className = "yao-line " + (info.yang ? "yang" : "yin");
    originalCell.innerHTML = (info.yang ? "━━━━" : "━━&nbsp;&nbsp;━━") + (info.mark ? ` <b class="yao-mark">${info.mark}</b>` : "");
    row.classList.add("revealed");
  }

  // 第二階段：本卦六爻都出來之後，才補上之卦欄位（動爻才畫箭頭）
  function fillTransformedCell(row, lineValue, transformedYang) {
    row.querySelector(".yao-arrow").textContent = isChanging(lineValue) ? "→" : "";

    const transformedCell = row.querySelectorAll(".yao-line")[1];
    transformedCell.className =
      "yao-line fade-in " + (transformedYang ? "yang" : "yin") + (isChanging(lineValue) ? " changed" : " unchanged");
    transformedCell.innerHTML = transformedYang ? "━━━━" : "━━&nbsp;&nbsp;━━";
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
  }

  async function castAndAnimate(question) {
    btnCast.disabled = true;

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
    header.innerHTML = '<span class="yao-label"></span><span class="yao-line">本卦</span><span class="yao-arrow"></span><span class="yao-line">之卦</span>';
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
    titleEl.textContent = `本卦：${result.original.number}．${result.original.name}`;

    if (!result.hasChange) {
      const note = document.createElement("p");
      note.className = "iching-no-change fade-in";
      note.textContent = "六爻不變";
      stageEl.appendChild(note);
    } else {
      await delay(550);

      // 第二階段：本卦整卦出來後，才跳之卦——把每一爻的之卦欄位補上
      for (let i = 0; i < 6; i++) {
        fillTransformedCell(rows[i], result.lines[i], result.transformed.binary[i] === "1");
        await delay(120);
      }

      await delay(250);
      const transformedTitle = document.createElement("h2");
      transformedTitle.className = "iching-title transformed pop-in";
      transformedTitle.textContent = `之卦：${result.transformed.number}．${result.transformed.name}`;
      stageEl.appendChild(transformedTitle);
    }

    renderJudgmentAndTexts(result);

    btnCast.disabled = false;
  }

  btnCast.addEventListener("click", () => {
    castAndAnimate(questionInput.value.trim());
  });
})();
