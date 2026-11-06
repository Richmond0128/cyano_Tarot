(function () {
  window.TarotState = window.TarotState || {};
  window.TarotState.question = "";

  const questionSection = document.getElementById("tarot-question-section");
  const tableSection = document.getElementById("tarot-table-section");
  const questionInput = document.getElementById("tarot-question");
  const btnStart = document.getElementById("btn-tarot-start");
  const btnSkip = document.getElementById("btn-tarot-skip");
  const quickResultActions = document.getElementById("quick-result-actions");
  const btnQuickAgain = document.getElementById("btn-quick-again");
  const btnQuickMore = document.getElementById("btn-quick-more");
  const btnQuickBack = document.getElementById("btn-quick-back");

  function enterTable(question) {
    window.TarotState.question = question;
    questionSection.classList.add("hidden");
    tableSection.classList.remove("hidden");
    tableSection.classList.remove("quick-result-mode");
    quickResultActions.classList.add("hidden");
  }

  btnStart.addEventListener("click", () => enterTable(questionInput.value.trim()));
  btnSkip.addEventListener("click", () => enterTable(""));

  initTarotTable();

  // 首頁「抽一張／抽三張／抽五張」：直接進結果畫面，不用走完整牌桌
  let lastQuickCount = 3;

  function runQuickPreset(n) {
    lastQuickCount = n;
    window.TarotState.question = "";
    questionSection.classList.add("hidden");
    tableSection.classList.remove("hidden");
    tableSection.classList.add("quick-result-mode");
    quickResultActions.classList.remove("hidden");
    window.TarotTable.quickDrawMany(n);
  }

  document.querySelectorAll("#tarot-question-section .quick-count-btn").forEach((btn) => {
    btn.addEventListener("click", () => runQuickPreset(parseInt(btn.dataset.count, 10)));
  });

  btnQuickAgain.addEventListener("click", () => runQuickPreset(lastQuickCount));
  btnQuickMore.addEventListener("click", () => {
    const card = window.TarotTable.quickDrawOneMore();
    if (!card) showToast("牌已經抽完囉，點「再抽一次」重新洗牌");
  });
  btnQuickBack.addEventListener("click", () => {
    tableSection.classList.add("hidden");
    tableSection.classList.remove("quick-result-mode");
    quickResultActions.classList.add("hidden");
    questionSection.classList.remove("hidden");
  });

  document.querySelectorAll(".tool-btn-icon").forEach(attachLongPressTooltip);

  // AI 解牌：把目前抽到的牌（跟有填的話的問題）組成一段提示詞，給使用者複製去貼到自己慣用的AI
  function buildTarotAiPromptText(question, drawn) {
    let text = "請你扮演一位專業、溫暖的塔羅占卜師，根據我抽到的牌卡，給我具體且有同理心的解讀。\n";

    text += "\n【我的問題】\n";
    text += question ? question : "（沒有特別設定問題，請針對我目前整體的狀態／能量做解讀）";
    text += "\n";

    text += "\n【抽到的牌】（依抽出順序）\n";
    drawn.forEach((d, i) => {
      text += `${i + 1}. ${d.card.nameZh}（${d.reversed ? "逆位" : "正位"}）\n`;
    });

    text += "\n【回答格式，請依序輸出】\n";
    text += "1. 整體氛圍：綜合所有牌卡，先給出這個牌陣傳達的整體訊息\n";
    text += "2. 逐牌解讀：針對每一張牌，說明它在正位／逆位、在我的問題脈絡下代表的意義\n";
    text += "3. 建議：給出具體、可行動的建議\n";
    text += "4. 提醒：若牌義之間有衝突或不確定之處，請誠實說明，不要硬凹\n";

    text += "\n【限制】\n";
    text += "請以偉特塔羅（Rider-Waite-Smith）傳統牌義作為解讀依據，可以融入你的理解，但不要憑空捏造牌義；語氣溫暖務實，不要恐嚇或危言聳聽。";

    return text;
  }

  function openAiPromptSheet(promptText) {
    const content = document.createElement("div");
    content.className = "sheet-content ai-prompt-sheet";

    const title = document.createElement("h3");
    title.className = "sheet-title";
    title.textContent = "AI 解牌提示詞";
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
        preview.select();
        showToast("自動複製失敗，已幫你選取文字，請手動複製");
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

    openSheet(content);
  }

  const btnAiInterpret = document.getElementById("btn-ai-interpret");
  if (btnAiInterpret) {
    btnAiInterpret.addEventListener("click", () => {
      const drawn = (window.TarotState.getDrawn && window.TarotState.getDrawn()) || [];
      if (drawn.length === 0) {
        showToast("請先抽牌，才能生成AI解牌提示詞");
        return;
      }
      openAiPromptSheet(buildTarotAiPromptText(window.TarotState.question, drawn));
    });
  }
})();
