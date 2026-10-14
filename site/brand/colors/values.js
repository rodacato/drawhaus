for (const card of document.querySelectorAll("[data-palette]")) {
  const palette = getComputedStyle(card);
  for (const label of card.querySelectorAll("[data-palette-value]")) {
    label.textContent = palette
      .getPropertyValue(`--palette-${label.dataset.paletteValue}`)
      .trim()
      .toUpperCase();
  }
}
