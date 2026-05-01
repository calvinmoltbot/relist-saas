// Receives ingest payloads from content scripts and posts them to the user's
// Relist instance with their Bearer token. No default URL — fail loudly if unset.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "relist/ingest") return;
  ingest(msg.payload).then(sendResponse).catch((e) =>
    sendResponse({ ok: false, error: e.message }),
  );
  return true; // async response
});

async function ingest(payload) {
  const { apiBase, apiKey } = await chrome.storage.local.get(["apiBase", "apiKey"]);
  if (!apiBase) throw new Error("Relist apiBase not set — open the extension popup.");
  if (!apiKey) throw new Error("Relist apiKey not set — open the extension popup.");

  const res = await fetch(`${apiBase}/api/price-data/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
  return res.json();
}
