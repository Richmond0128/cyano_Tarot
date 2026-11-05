// 金錢卦起卦：擲銅錢 → 本卦 → 動爻 → 之卦
// 資料表來自 iching-data.js（ICHING_HEXAGRAMS / getHexagramByBinary）
(function () {
  // 銅錢面值：字面(有文字)=陽=3，幕面(無文字)=陰=2（京房金錢卦慣例）
  // 如果網站用的銅錢圖正反面想反過來算，只要對調這兩個值
  const COIN_YANG_VALUE = 3;
  const COIN_YIN_VALUE = 2;

  const YAO_LABELS = ["初", "二", "三", "四", "五", "上"];

  function tossCoin() {
    return Math.random() < 0.5 ? COIN_YANG_VALUE : COIN_YIN_VALUE;
  }

  // 一爻 = 擲3枚銅錢加總：6老陰 7少陽 8少陰 9老陽
  function tossLine() {
    return tossCoin() + tossCoin() + tossCoin();
  }

  function isYang(value) {
    return value === 7 || value === 9;
  }

  function isChanging(value) {
    return value === 6 || value === 9;
  }

  // index 0 = 初爻（最下）...index 5 = 上爻（最上）
  function castLines() {
    const lines = [];
    for (let i = 0; i < 6; i++) lines.push(tossLine());
    return lines;
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
      return { rule: "六爻皆不變：以本卦卦辭為斷", primary: { source: `本卦卦辭`, text: originalHex.guaci } };
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
    const lines = castLines();
    const changingIndices = [];
    lines.forEach((v, i) => {
      if (isChanging(v)) changingIndices.push(i);
    });

    const originalHex = getHexagramByBinary(binaryOf(lines, false));
    const transformedHex = getHexagramByBinary(binaryOf(lines, true));

    return {
      question: question || "",
      time: new Date(),
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

  // ---- DOM ----
  const formEl = document.getElementById("iching-form");
  if (!formEl) return; // 這個頁面沒有易經區塊時直接略過

  const questionInput = document.getElementById("iching-question");
  const resultEl = document.getElementById("iching-result");
  const btnCast = document.getElementById("btn-iching-cast");

  function renderLineRow(container, label, lineValue, transformedYang) {
    const row = document.createElement("div");
    row.className = "yao-row";

    const labelEl = document.createElement("span");
    labelEl.className = "yao-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const info = lineSymbolLabel(lineValue);
    const original = document.createElement("span");
    original.className = "yao-line " + (info.yang ? "yang" : "yin");
    original.innerHTML = (info.yang ? "━━━━" : "━━&nbsp;&nbsp;━━") + (info.mark ? ` <b class="yao-mark">${info.mark}</b>` : "");
    row.appendChild(original);

    const arrow = document.createElement("span");
    arrow.className = "yao-arrow";
    arrow.textContent = isChanging(lineValue) ? "→" : "";
    row.appendChild(arrow);

    const transformed = document.createElement("span");
    transformed.className = "yao-line " + (transformedYang ? "yang" : "yin") + (isChanging(lineValue) ? " changed" : " unchanged");
    transformed.innerHTML = transformedYang ? "━━━━" : "━━&nbsp;&nbsp;━━";
    row.appendChild(transformed);

    container.appendChild(row);
  }

  function renderHexagramText(title, hex, highlightIndices) {
    const wrap = document.createElement("div");
    wrap.className = "gua-text-block";

    const h = document.createElement("h3");
    h.textContent = `${title}：${hex.number}．${hex.name}（${hex.fullName}）`;
    wrap.appendChild(h);

    const guaci = document.createElement("p");
    guaci.className = "gua-ci";
    guaci.textContent = "卦辭：" + hex.guaci;
    wrap.appendChild(guaci);

    const list = document.createElement("ul");
    list.className = "yao-ci-list";
    hex.yao.forEach((y, i) => {
      const li = document.createElement("li");
      if (highlightIndices && highlightIndices.includes(i)) li.className = "changing";
      li.textContent = `${y.label}：${y.text}`;
      list.appendChild(li);
    });
    wrap.appendChild(list);

    if (hex.yongjiu || hex.yongliu) {
      const extra = document.createElement("p");
      extra.className = "gua-ci";
      extra.textContent = hex.yongjiu ? "用九：" + hex.yongjiu : "用六：" + hex.yongliu;
      wrap.appendChild(extra);
    }

    return wrap;
  }

  function renderResult(result) {
    resultEl.innerHTML = "";
    resultEl.classList.remove("hidden");

    const summary = document.createElement("div");
    summary.className = "iching-summary";
    const title = result.hasChange
      ? `${result.original.number}．${result.original.name} → ${result.transformed.number}．${result.transformed.name}`
      : `${result.original.number}．${result.original.name}（六爻不變）`;
    summary.innerHTML = `
      <p class="iching-question">問題：${result.question || "（未填寫）"}</p>
      <p class="iching-time">時間：${result.time.toLocaleString("zh-TW")}</p>
      <h2 class="iching-title">${title}</h2>
    `;
    resultEl.appendChild(summary);

    const table = document.createElement("div");
    table.className = "yao-table";
    const header = document.createElement("div");
    header.className = "yao-row yao-row-header";
    header.innerHTML = `<span class="yao-label"></span><span class="yao-line">本卦</span><span class="yao-arrow"></span><span class="yao-line">之卦</span>`;
    table.appendChild(header);

    for (let i = 5; i >= 0; i--) {
      const label = YAO_LABELS[i] + "爻";
      const transformedYang = result.transformed.binary[i] === "1";
      renderLineRow(table, label, result.lines[i], transformedYang);
    }
    resultEl.appendChild(table);

    const judgment = document.createElement("div");
    judgment.className = "iching-judgment";
    let judgmentHtml = `<p class="judgment-rule">${result.judgment.rule}</p>`;
    judgmentHtml += `<p class="judgment-text"><span class="judgment-source">${result.judgment.primary.source}</span>　${result.judgment.primary.text}</p>`;
    if (result.judgment.secondary) {
      judgmentHtml += `<p class="judgment-text"><span class="judgment-source">${result.judgment.secondary.source}</span>　${result.judgment.secondary.text}</p>`;
    }
    judgment.innerHTML = judgmentHtml;
    resultEl.appendChild(judgment);

    resultEl.appendChild(renderHexagramText("本卦", result.original, result.changingIndices));
    if (result.hasChange) {
      resultEl.appendChild(renderHexagramText("之卦", result.transformed));
    }
  }

  btnCast.addEventListener("click", () => {
    const result = castHexagram(questionInput.value.trim());
    renderResult(result);
  });
})();
