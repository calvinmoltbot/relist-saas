const $ = (id) => document.getElementById(id);

async function load() {
  const { apiBase = "", apiKey = "" } = await chrome.storage.local.get(["apiBase", "apiKey"]);
  $("apiBase").value = apiBase;
  $("apiKey").value = apiKey;
}

async function save() {
  const apiBase = $("apiBase").value.trim().replace(/\/+$/, "");
  const apiKey = $("apiKey").value.trim();
  await chrome.storage.local.set({ apiBase, apiKey });
  setStatus("Saved.", "ok");
}

async function test() {
  const { apiBase, apiKey } = await chrome.storage.local.get(["apiBase", "apiKey"]);
  if (!apiBase || !apiKey) {
    setStatus("Set API base and key first.", "err");
    return;
  }
  setStatus("Testing…");
  try {
    const res = await fetch(`${apiBase}/api/price-data/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        source: "test",
        externalId: `ping-${Date.now()}`,
        title: "Connection test",
        priceMinor: 0,
        currency: "GBP",
      }),
    });
    if (res.ok) setStatus(`OK (${res.status}).`, "ok");
    else setStatus(`Failed: ${res.status} ${await res.text()}`, "err");
  } catch (e) {
    setStatus(`Network error: ${e.message}`, "err");
  }
}

function setStatus(msg, cls) {
  const s = $("status");
  s.textContent = msg;
  s.className = "status " + (cls ?? "");
}

$("save").addEventListener("click", save);
$("test").addEventListener("click", test);
load();
