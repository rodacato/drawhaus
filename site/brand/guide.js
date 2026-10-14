const samples = [...document.querySelectorAll(".theme-sample")];
function resolveToken(element, name) {
  // A probe resolves aliases such as var(--color-brand-dark-ink).
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  element.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}
function rgbHex(value) {
  const channels = value
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  return channels
    ? `#${channels.map((part) => Math.round(part).toString(16).padStart(2, "0")).join("")}`.toUpperCase()
    : value;
}
function ratio(first, second) {
  const luminance = (value) => {
    const channels = value
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map((part) => {
        const channel = Number(part) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
function updateValues() {
  document.querySelectorAll("[data-token]").forEach((label) => {
    const name = label.dataset.token;
    label.textContent = name.startsWith("--color-")
      ? rgbHex(resolveToken(label.parentElement, name))
      : getComputedStyle(label).getPropertyValue(name).trim();
  });
  const sample = document.querySelector(".color-system");
  const body = ratio(
    resolveToken(sample, "--color-brand-ink"),
    resolveToken(sample, "--color-brand-paper"),
  );
  const action = ratio(
    resolveToken(sample, "--color-brand-on-action"),
    resolveToken(sample, "--color-brand-action"),
  );
  sample.querySelector(".contrast-note").textContent =
    `Measured sample pairs: body ${body.toFixed(2)}:1 · action label ${action.toFixed(2)}:1`;
}
document.querySelector(".theme-toggle").addEventListener("click", (event) => {
  const dark = event.currentTarget.getAttribute("aria-pressed") !== "true";
  event.currentTarget.setAttribute("aria-pressed", String(dark));
  event.currentTarget.textContent = dark ? "Preview light" : "Preview dark";
  samples.forEach((sample) => sample.classList.toggle("theme-dark", dark));
  updateValues();
});
updateValues();
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.setAttribute("aria-live", "polite");
  const initial = button.textContent;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Clipboard unavailable";
    }
    setTimeout(() => {
      button.textContent = initial;
    }, 1800);
  });
});
