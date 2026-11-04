# Habit & Sleep Tracker

A single-page monthly habit and sleep tracker. Track up to 10 daily habits on a circular ring chart, log your nightly sleep, and export the whole month as a printable A4 PDF.

No build step, no backend, no account. Everything runs in the browser and is saved locally.

## Features

- **Circular habit ring**: 10 habits across up to 31 days. Tap a box to cycle through blank, done (blue) and missed (red).
- **Daily check-in**: answer one question per habit ("Did you complete ...?") with Yes or No, step through days, skip or go back.
- **Live completion percentage** shown in the center of the ring.
- **Sleep tracker**: log hours slept each night (from 10 hrs down to under 5 hrs), with nights logged and average sleep calculated automatically.
- **Notes sections**: Key goals, Contract & reward, and free-form Notes.
- **PDF export**: download the month as a one-page A4 portrait PDF, drawn as vectors (uses jsPDF).
- **Automatic month handling**: days that do not exist in the current month are greyed out, and when a new month starts the previous month is archived and a clean sheet begins.
- **Responsive and accessible**: works on desktop and mobile, with keyboard focus styles and ARIA labels.
- **Private by design**: all data is stored in your browser's `localStorage` on your device.

## Getting started

No installation needed.

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/<your-repo>.git
   cd <your-repo>
   ```
2. Open `index.html` in your browser.

Or serve it locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

It can also be hosted for free with GitHub Pages: go to **Settings > Pages**, choose your branch and the root folder, and save.

## Usage

1. Enter your name and the names of your habits in the list beside the ring.
2. Use the **Check-in** card to answer each habit for the selected day, or tap the ring boxes directly.
3. Tap a cell in the **Sleep Tracker** grid to log the hours you slept for that day. Tap again to clear it.
4. Fill in your goals, reward contract and notes at the top.
5. Click **Download PDF** to save a printable copy of the month.
6. Use **Clear this month** (tap twice to confirm) to reset the boxes and start over.

## Project structure

```
.
├── index.html   # Page markup
├── style.css    # Layout and styling
└── script.js    # Ring rendering, check-in flow, sleep grid, storage, PDF export
```

## Tech stack

- Plain HTML, CSS and JavaScript (no framework)
- SVG for the circular tracker
- [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 (loaded from cdnjs) for PDF export
- Google Fonts: Figtree and Instrument Serif

## Data and privacy

Your data is saved in `localStorage` under the key `habit-sleep-tracker-v1`. It never leaves your device. Because storage is per browser and per device, clearing site data or switching browsers will start a fresh tracker. Past months are kept in an in-browser archive when a new month begins.

## Customization

- **Number of habits**: change `N` in `script.js` (the ring and PDF are built from this value).
- **Colors and fonts**: edit the CSS variables at the top of `style.css` (`--accent`, `--miss`, `--font-body`, and so on).
- **Sleep buckets**: edit the `HOURS` and `HVAL` arrays in `script.js`.

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you would like to change.

## License

Add your preferred license here (for example, MIT) and include a `LICENSE` file.

## Credits

Circular layout inspired by printable habit tracker sheets. PDF footer credit: Besol Labs.
