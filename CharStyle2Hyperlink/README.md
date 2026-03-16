# CharStyle2Hyperlink

*Instructions in other languages: [Русский](README.ru.md)*

An Adobe InDesign script that converts text with a specified character style into clickable hyperlinks. URL is taken directly from the text content.

---

## What it does

When preparing documents for PDF export — scientific publications, catalogs, reports — URLs in the text are often styled but not linked. 
I only needed to link to a few of them. **CharStyle2Hyperlink** finds all text runs with a given character style and creates proper hyperlinks from them in one click.

1. Scans the target scope for text with the selected character style
2. Validates each text run as a URL (`http://`, `https://`, `mailto:`, `tel:`, `www.`)
3. Strips soft returns and invisible characters InDesign may have inserted inside long URLs
4. Reuses existing `HyperlinkURLDestination` if the same URL is already in the document
5. Creates a `HyperlinkTextSource` and links it to the destination
6. Reports created, skipped, and failed items with page numbers

All changes are wrapped in a **single Undo step**.

---

## Supported URL schemes

- `https://` and `http://`
- `mailto:`
- `tel:`
- `www.` (without scheme)

---

## Installation

1. Download `CharStyle2Hyperlink.jsx`
2. Place it in your InDesign Scripts folder:
   - **Mac:** `~/Library/Application Support/Adobe/InDesign/[version]/[language]/Scripts/Scripts Panel/`
   - **Windows:** `%AppData%\Adobe\InDesign\[version]\[language]\Scripts\Scripts Panel\`
3. Open the Scripts panel: **Window → Utilities → Scripts**
4. Double-click `CharStyle2Hyperlink` to run

---

## Usage

1. Open a document with URLs styled using a character style
2. Run the script
3. In the dialog:
   - Select the **character style** from the dropdown
   - Choose the **scope** — entire document, current frame story, or selected text
4. Click **Run**
5. Review the report

---

## Dialog

- **Character style** — dropdown with all character styles found in the document
- **Scope:**
  - *Entire document* — all stories including master pages
  - *Current frame story* — the full story containing the active frame (all threaded frames)
  - *Selected text* — only the current text selection

---

## Report

After processing, a report dialog shows:

- ✅ **Created** — hyperlinks successfully created
- ⚠️ **Skipped** — text had the style applied but is not a valid URL
- ❌ **Errors** — valid URL but hyperlink could not be created (e.g. already linked), with error message

Skipped and error items are shown in scrollable text areas with page numbers in the format:

```
https://doi.org/10.1038/301053a0 --- page 48 (The object you have chosen is already in use by another hyperlink.)
```

---

## Notes

- The script deduplicates `findText` results — InDesign occasionally returns the same text object twice when character styles overlap
- Soft returns (`↵`) inserted by InDesign inside long URLs for line wrapping are automatically removed before the URL is used
- Destinations are named after the URL — no auto-generated `URL 1`, `URL 2` names

---

## Compatibility

Tested with Adobe InDesign CC 2025 (20.5.2) on macOS.

---

## License

MIT License © 2026 Vlad Ossipov | [vladossipov.ru](https://vladossipov.ru)
