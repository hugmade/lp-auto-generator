/**
 * 神と青よもぎ LP — 軽いスクロール体験用
 * セクションがビューポートに入ったら .is-inview を付与し、フェード表示
 */
(function () {
  const sections = document.querySelectorAll(".section");
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
})();
