// Minimal Vinted listing scraper. The original Relist extension does richer
// extraction; this is a placeholder that captures the essentials so the
// end-to-end ingest path is wired up. Refine selectors when porting.

(function run() {
  try {
    const title =
      document.querySelector('h1[itemprop="name"]')?.textContent?.trim() ??
      document.querySelector("h1")?.textContent?.trim();
    const priceText =
      document.querySelector('[data-testid="item-price"]')?.textContent ??
      document.querySelector('[itemprop="price"]')?.getAttribute("content") ??
      "";
    const priceMatch = priceText.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
    const priceMinor = priceMatch ? Math.round(parseFloat(priceMatch[1]) * 100) : null;

    const brand =
      document.querySelector('[itemprop="brand"]')?.textContent?.trim() ?? null;

    const idMatch = location.pathname.match(/\/items\/(\d+)/);
    if (!title || priceMinor == null || !idMatch) return;

    chrome.runtime.sendMessage({
      type: "relist/ingest",
      payload: {
        source: "vinted",
        externalId: idMatch[1],
        title,
        brand,
        priceMinor,
        currency: location.host.endsWith(".co.uk") ? "GBP" : "EUR",
        url: location.href,
      },
    });
  } catch {
    // never block the page
  }
})();
