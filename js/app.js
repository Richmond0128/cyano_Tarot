(function () {
  const btnModeFull = document.getElementById("tarot-mode-full");
  const btnModeQuick = document.getElementById("tarot-mode-quick");
  const fullSection = document.getElementById("tarot-full-section");
  const quickSection = document.getElementById("tarot-quick-section");

  function showFull() {
    fullSection.classList.remove("hidden");
    quickSection.classList.add("hidden");
    btnModeFull.classList.add("active");
    btnModeQuick.classList.remove("active");
  }

  function showQuick() {
    quickSection.classList.remove("hidden");
    fullSection.classList.add("hidden");
    btnModeQuick.classList.add("active");
    btnModeFull.classList.remove("active");
  }

  btnModeFull.addEventListener("click", showFull);
  btnModeQuick.addEventListener("click", showQuick);

  // AI 解牌：按鈕先做好位置，實際把抽牌結果組成提示詞、複製給使用者貼去
  // 自己的AI的功能之後再接，這裡先留一個沒有行為的按鈕
  const btnAiInterpret = document.getElementById("btn-ai-interpret");
  if (btnAiInterpret) {
    btnAiInterpret.addEventListener("click", () => {
      // TODO: 之後在這裡組成提示詞並複製到剪貼簿
    });
  }

  initFullMode();
  initQuickMode();
})();
