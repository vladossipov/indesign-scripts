# CharStyleCollect

*Instructions in other languages: [Русский](README_ru.md)*

An Adobe InDesign script that collects all words with a specified character style and places them into a new text frame, joined by a custom separator.

---

## What it does

When working on indexes, glossaries, or style audits, it is useful to extract all words marked with a particular character style — terms, keywords, proper names — without manually scanning every page.

**CharStyleCollect** scans all stories in the document, collects every word that has the selected character style applied, and places the result into a new text frame on the first page.

1. Scans all stories in the document character by character
2. Collects words where the specified character style is applied
3. Optionally deduplicates — keeping only unique words
4. Optionally applies case-sensitive deduplication
5. Joins the collected words with a custom separator (space, comma, new line, tab, or any string)
6. Places the result into a new auto-sized text frame on the first page

---

## Dialog options

- **Character style** — dropdown with all character styles found in the document
- **Separator** — any string used to join words; supports `\n` (new line) and `\t` (tab)
- **Unique words only** — remove duplicate words from the result
- **Case sensitive** — when deduplicating, treat `Word` and `word` as different entries

---

## Installation

1. Download `CharStyleCollect.jsx`
2. Place it in your InDesign Scripts folder:
   - **Mac:** `~/Library/Application Support/Adobe/InDesign/[version]/[language]/Scripts/Scripts Panel/`
   - **Windows:** `%AppData%\Adobe\InDesign\[version]\[language]\Scripts\Scripts Panel\`
3. Open the Scripts panel: **Window → Utilities → Scripts**
4. Double-click `CharStyleCollect` to run

---

## Usage

1. Open a document with text styled using a character style
2. Run the script
3. In the dialog:
   - Select the **character style** to collect from
   - Enter a **separator** (default: space)
   - Set deduplication options as needed
4. Click **Run**
5. A new text frame with the collected words appears on the first page

---

## Notes

- InDesign special objects (variables, footnote markers, anchors) are skipped automatically — only real text characters are collected
- Words are defined as sequences of non-whitespace characters within a styled run; spaces, non-breaking spaces, and paragraph returns act as word boundaries
- The output frame is auto-sized to fit its content

---

## Compatibility

Tested with Adobe InDesign CC 2025 (20.5.2) on macOS. Compatible with CS6 and later.

---

## License

MIT License © 2026 Vlad Ossipov | [vladossipov.ru](https://vladossipov.ru)
