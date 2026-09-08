/* Local progressive enhancement: source panels are visible without this script. */
(() => {
  for (const root of document.querySelectorAll("[data-site-profile]")) {
    if (root.dataset.siteProfileReady) continue;
    const controls = root.querySelector(".site-language-controls");
    if (!controls) continue;
    const buttons = [...controls.querySelectorAll("button[data-site-language]")];
    const panels = [...root.querySelectorAll(".site-language-panel[lang][id]")];
    const entries = buttons.map(button => ({
      button,
      panel: panels.find(panel => panel.id === button.getAttribute("aria-controls") && panel.lang === button.dataset.siteLanguage),
    }));
    // An incomplete language mapping must never hide source material.
    if (entries.length < 2 || entries.some(entry => !entry.panel) ||
        new Set(entries.map(entry => entry.panel)).size !== panels.length || entries.length !== panels.length) continue;
    const show = language => {
      for (const {button, panel} of entries) {
        const selected = panel.lang === language;
        panel.hidden = !selected;
        panel.toggleAttribute("inert", !selected);
        button.setAttribute("aria-pressed", String(selected));
      }
    };
    for (const {button, panel} of entries) button.addEventListener("click", () => show(panel.lang));
    show(entries.find(({panel}) => panel.lang === "zh-CN")?.panel.lang ?? entries[0].panel.lang);
    controls.hidden = false;
    root.dataset.siteProfileReady = "true";
  }
})();
