# Relist extension

Manifest V3 Chrome extension. Sends Vinted listing data to your Relist instance
via Bearer token.

## Install (unpacked, dev)

1. Open `chrome://extensions`, enable Developer mode.
2. "Load unpacked" → select this `extension/` folder.
3. Click the extension icon. Set:
   - **API base**: your deployed Relist URL (e.g. `https://your-relist.vercel.app`)
   - **API key**: generate one at `/settings/api-keys` in Relist.
4. Click **Save**, then **Test** — should show `OK (200)`.
5. Visit a Vinted listing — data ingests automatically.

No default URL is hardcoded. Both fields must be set.
