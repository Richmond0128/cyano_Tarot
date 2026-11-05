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

  initFullMode();
  initQuickMode();
})();
