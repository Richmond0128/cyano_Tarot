// 塔羅頁專用：產生星空背景的小圓點，分遠／近兩層，製造景深。
// 用 box-shadow 一次畫完一層，不用真的塞幾十個 DOM 節點。
(function () {
  function randomDots(count, size, colorFn) {
    var shadows = [];
    for (var i = 0; i < count; i++) {
      var x = (Math.random() * 100).toFixed(2);
      var y = (Math.random() * 100).toFixed(2);
      shadows.push(x + "vw " + y + "vh 0 " + size + "px " + colorFn());
    }
    return shadows.join(",");
  }

  function paintStars() {
    var far = document.querySelector(".star-dot.layer-far");
    var near = document.querySelector(".star-dot.layer-near");
    if (far) {
      far.style.boxShadow = randomDots(90, 0, function () {
        var op = (Math.random() * 0.35 + 0.25).toFixed(2);
        return "rgba(239,232,247," + op + ")";
      });
    }
    if (near) {
      near.style.boxShadow = randomDots(26, 0.6, function () {
        var gold = Math.random() > 0.6;
        var op = (Math.random() * 0.3 + 0.5).toFixed(2);
        return gold ? "rgba(212,175,106," + op + ")" : "rgba(239,232,247," + op + ")";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paintStars);
  } else {
    paintStars();
  }
})();
