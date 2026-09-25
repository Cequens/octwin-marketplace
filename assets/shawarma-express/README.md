# Shawarma Express — the hosted menu file

The file the pack's `menu-file` flow sends when a customer asks for the full menu. It lives
**here, outside the pack**, on purpose: in a real install the restaurant hosts its own menu (its
website, a POS export, a shared drive), the operator pastes that address into the pack's
**Printable menu** connection, and the pack fetches whatever the address serves
(`integrations.yaml` → `menu_pdf`, `response: { expect: binary }`). This folder plays the
restaurant's website for the demo. Nothing here is in the pack bundle.

| File | What it is |
|---|---|
| `menu.html` | The source — one A4 page, Arabic first with English under each item |
| `menu.png` | The picture the pack's connection uses by DEFAULT (`base_url: { default }`) — sent as a WhatsApp **photo** |
| `menu.pdf` | The same page as a PDF — point the connection here to send a **document** instead |

Public addresses (the repo is public; GitHub serves them with a 5-minute cache):

- `https://raw.githubusercontent.com/Cequens/octwin-marketplace/master/assets/shawarma-express/menu.pdf`
- `https://raw.githubusercontent.com/Cequens/octwin-marketplace/master/assets/shawarma-express/menu.png`

**Which one:** the PDF stays sharp at any zoom and can be saved or printed — one tap to open. The
PNG shows straight in the chat, but the platform stores images at 1600px on the long edge, so the
small English lines soften on a phone.

## The content is the pack's own

Dishes, prices, branches, hours and phones are the `demo:` rows in
[`../../shawarma-express/xrm.yaml`](../../shawarma-express/xrm.yaml); the delivery fee and minimum
order are `config.delivery` in [`manifest.yaml`](../../shawarma-express/manifest.yaml); prices use
Arabic-Indic digits like the pack (`default_settings.digits: native`). **Change the pack's menu and
this file together**, or the file and the in-chat carousel disagree.

## Re-render (Windows, Chrome installed)

Both paths must be Windows paths, and fonts load from Google Fonts, so the render needs a network.

```bash
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PAGE="file:///C:/projects/octwin-marketplace/assets/shawarma-express/menu.html"
FLAGS="--headless=new --no-sandbox --disable-gpu --user-data-dir=C:/Users/<you>/AppData/Local/Temp/chrome-shot --virtual-time-budget=15000"

"$CHROME" $FLAGS --no-pdf-header-footer \
  --print-to-pdf="C:\projects\octwin-marketplace\assets\shawarma-express\menu.pdf" "$PAGE"

"$CHROME" $FLAGS --hide-scrollbars --force-device-scale-factor=2 --window-size=794,1123 \
  --screenshot="C:\projects\octwin-marketplace\assets\shawarma-express\menu.png" "$PAGE"
```

The page is exactly one A4 sheet (`794×1123` CSS px); content that grows past it is cut, so check
the PNG after an edit.
