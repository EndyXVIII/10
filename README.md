# Endy & Sandy 🌻 — "Girasole"

A one-month gift for Sandy. A single-page web app made of plain HTML, CSS and JavaScript, with no build step.

```
index.html
css/style.css
js/main.js        ← every section, the animations and interactions
js/fx.js          ← hearts, petals and sparkles particle effects
data/content.json ← ALL the personal texts (edit this one)
assets/           ← favicon, icons, og-image.png, music.mp3 (yours), foto/ (yours)
```

## 1. Run it locally

The page loads JSON files, so it must be served over http (opening `index.html` by double-clicking won't work).

```bash
cd "/Users/endyhysa/Desktop/10:10"
```

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. To try it on your phone, use the same Wi-Fi and open `http://<your-Mac's-IP>:8000`. You can find the IP under System Settings → Wi-Fi → Details.

The secret accepts `10/10`, `10 ottobre`, `10/10/2026`, `10-10` (plus small variants like `10.10`, `10 ott`).

**Before sending:** you'll have opened petals and letters while testing. Open `http://localhost:8000/?reset` once to clear that saved progress (it's stored per browser/device, so Sandy always starts fresh on her phone anyway).

## 2. Edit the content

Everything personal lives in `data/content.json`. Keep the JSON valid: double quotes, and commas between items but not after the last one.

- `petali[]`: 31 petals. `titolo` is required. `testo` and `foto` are optional. If both are empty, the card shows the title and a small hand-drawn sunflower.
- `lettere[]`: the "Apri quando…" envelopes. `etichetta` is the label on the envelope, `testo` is the letter. A blank line in `testo` (`\n\n`) starts a new paragraph.
- `lettere_saluto` / `lettere_firma`: the opening ("Amore mio,") and closing ("Per sempre tuo,") shared by every letter. If an `etichetta` starts with "Apri quando", the envelope prints that part in small caps and the rest in handwriting.
- `nome_affettuoso`: how she's called in the letters and texts ("amore mio").
- `messaggio_festa`: the paragraph under the finale title ("Un pensiero per il nostro primo mese ufficiale!"), about celebrating it like this because you're far apart.
- `messaggio_finale_girasole`: appears letter by letter when all 31 petals are open.
- `messaggio_segreto`: the easter egg. **Long-press the little sun** next to the sunflower.
- `messaggio_chiusura`: the closing line of the finale.
- `canzone.frasi`: four slots for lines from Alfa's *Eri solo da incontrare*. Paste the lines you want yourself. Use `\n` for a line break. An empty slot is simply not shown. Each slot appears in a fixed place:
  - `apertura`: on the opening screen, under "Il nostro primo mese ufficiale!"
  - `mappa`: after the boarding pass, under the plane map
  - `cielo`: at the end of "IV · posta aerea", after the reply button (the slot kept its old name)
  - `finale`: in the finale, before your signature

  Example: `"finale": "prima riga\nseconda riga"`
- `finestre`: the "noi due" section. Two polaroids start at opposite edges of the screen (`io`: you in Granada, `tu`: her in Veternigo). As she scrolls they move toward each other until they touch, then `noi` (a photo or video of you two) opens on top of them, followed by `didascalia`. Put the files in `assets/foto/`. The section stays hidden until `io` and `tu` are both filled in; `noi` is optional. Example:
  ```json
  "finestre": {"io": "assets/foto/io.jpg", "tu": "assets/foto/tu.jpg", "noi": "assets/foto/noi.mp4", "didascalia": "Ogni chilometro finisce qui: in noi due."}
  ```
  Portrait photos (3:4 or 9:16) work best for `io` and `tu`; `noi` is shown wider than tall.
- `rullino`: photos and videos for "i nostri momenti", a stack of polaroids. Each one starts dark like a freshly printed polaroid: she rubs it with her finger to develop it (it also develops on its own after about 25 seconds), then flicks it away to see the next one. The section stays hidden while the list is empty. Example:
  ```json
  "rullino": [
    {"src": "assets/foto/primo-giorno.jpg", "didascalia": "Il primo giorno"},
    {"src": "assets/foto/noi.mp4", "didascalia": "Noi due"}
  ]
  ```
  Videos (`.mp4`, `.mov`, `.webm`) play muted on a loop while they're on top. Keep them short (5–15 s) and small (under ~8 MB).
- `battito`: the lines that appear one by one while she holds her finger on the heart in "V · anche adesso". `<em>` and `<br>` are allowed.
- `solo_te`: the phrases in "VI · solo te", shown one at a time as she scrolls. The last one is shown bigger. The third ("Miliardi…") is the one where all the dots go out except one, and from the fourth on the dots gather into a heart. `<em>` and `<br>` are allowed.
- `posta.frase`: the sentence the hearts spell out when she opens the airmail letter. Use `\n` to split it in two lines and keep each line short (about 12 characters) so it stays readable on a phone.
- `posta.biglietto`: the handwritten note left behind after the hearts dissolve. `\n` starts a new line.
- `data_inizio` / `ora_inizio`: when it all began (Italian summer time, CEST, UTC+2). Used for the "insieme da…" counter and the moon.

## 3. Photos and music

**Photos:** put them in `assets/foto/` (JPG, ideally ≤ 1600 px on the long side and under ~400 KB each) and reference them from a petal:

```json
{"giorno": 20, "titolo": "Il tuo sorriso", "testo": "", "foto": "assets/foto/sorriso.jpg"}
```

Photos load lazily, only when that petal is opened.

**Music:** save the track as `assets/music.mp3`. It starts by itself (fading in) the moment she types the date and opens the envelope: browsers never allow sound before the first tap, so that unlock is the earliest possible moment. If a browser still blocks it, it starts on her next tap anywhere. The ♪ button top-right turns it off/on, and it pauses while she's outside the page. While music is on, opening envelopes also makes a soft paper rustle.

**Voice message (strongly recommended):** record yourself on your phone (30–60 seconds, whatever you'd tell her if you were there) and save it as `assets/voce.mp3`. A golden play button then appears at the end of "V · anche adesso", and the music fades down while your voice plays. Without the file, nothing is shown. On iPhone, Voice Memos exports `.m4a`; convert it to mp3 (e.g. `ffmpeg -i voce.m4a -b:a 96k voce.mp3`) or rename the path in `index.html`.

## 4. Publish it for free and send her the link

### Option A: Netlify Drop (fastest, no account setup)

1. Go to <https://app.netlify.com/drop>.
2. Drag the whole `10:10` folder onto the page.
3. You get a link like `https://something-random.netlify.app`. You can rename it under *Site configuration → Change site name*, e.g. `endy-sandy.netlify.app`.

### Option B: GitHub Pages

1. Create a new repository on GitHub (it can be named e.g. `girasole`) and upload all the files, keeping the folders.
2. Open *Settings → Pages → Build and deployment*, pick *Deploy from a branch*, choose `main` / `(root)`, and save.
3. After about a minute the site is live at `https://<your-username>.github.io/girasole/`.

Note: GitHub Pages on a free account requires a **public** repository, so anyone with the URL could find the code. Netlify Drop doesn't have that issue.

### Make the WhatsApp preview look nice

WhatsApp needs a **full URL** for the preview image. Once you know your final address, open `index.html` and change:

```html
<meta property="og:image" content="assets/og-image.png">
```

to, for example:

```html
<meta property="og:image" content="https://endy-sandy.netlify.app/assets/og-image.png">
```

Then republish (drag the folder onto Netlify again, or commit on GitHub). WhatsApp caches previews, so send the link to yourself first to check. If you'd changed it after an earlier send, adding `?v=2` to the link forces a fresh preview.

## 5. Technical notes

- **Loading**: the sprout screen stays up until every photo, GIF, video and audio file named in `content.json` has downloaded, along with `assets/music.mp3`, the map data and the fonts. It shows a percentage while it waits. Files are kept in memory, so nothing loads late or stutters while she scrolls. On a very slow connection it gives up waiting after 90 seconds and opens anyway. Total weight is about 9 MB, mostly the music and the two GIFs.

- **Opening:** a night sky with two lights, Granada and Veternigo, joined by a thread with the distance on it. As she scrolls, the section stays pinned: the lights move together while the km count down, then meet in a flash, the sky turns to dawn, and the sunflower blooms ("Ovunque siamo, ci incontriamo qui."). It plays backwards if she scrolls back up.
- **The journey:** a thin dotted line on the right edge with a small heart that slides down as she reads, showing the km left ("1.204 km da te"). It reaches "sono qui · 0 km" at the end of the finale.

- **Airmail (IV · posta aerea):** a small plane flies in from the left towing an envelope on a string and leaves a trail of hearts. She taps the plane (or after 8 seconds it lets go by itself), and the envelope floats down under a heart-shaped parachute. Tapping the sunflower seal opens it: hundreds of hearts burst out, spell `posta.frase`, gather into a beating heart, then rise and dissolve, leaving the note. "Rispondi con un cuore" sends a heart flying off towards the top corner (Granada); nothing is actually sent anywhere.
- **Distance:** the haversine formula gives **1.596 km** between Granada and Veternigo in a straight line (great circle). That's the number shown.
- **Libraries (CDN):** GSAP 3.12.5 + ScrollTrigger (cdnjs), d3 7.9.0, topojson-client 3.1.0, world-atlas 2.0.2 (jsdelivr). Live weather comes from Open-Meteo, which needs no key.
- **Accessibility and performance:** respects `prefers-reduced-motion` (no pollen, no drifting petals, fast transitions). Animations use transform/opacity, and the canvases only animate while they're needed.
- Progress (open petals and letters) is saved in `localStorage` and works without it too.
