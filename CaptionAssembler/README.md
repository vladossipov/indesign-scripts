# CaptionAssembler

*Instructions in other languages: [Русский](README.ru.md)*

An Adobe InDesign script that automatically assembles inline graphics and their caption paragraphs into a properly grouped figure — ready for professional layout.

---

## What it does

When working with large illustrated documents (scientific publications, books, reports), captions are often placed as plain paragraphs right after inline graphics. **CaptionAssembler** finds these pairs and does the following in one click:

1. Applies your **Figure** object style to the graphic frame
2. Creates a caption text frame directly — no dependency on Generate Static Caption
3. Transfers the caption text — including **multiple paragraphs with different styles** — into the caption frame
4. Groups the graphic and caption frame together
5. Applies your **Figure Group** object style to the group
6. Places the group back **inline** into the text flow at the original position
7. Removes the original caption paragraphs from the story

All paragraph styles from the original caption block are preserved exactly.

---

## Before / After

**Before** — inline graphic followed by caption paragraphs in the text flow:

![Before](https://i.ibb.co/yF3FR7Dv/before.png)

```
[inline image]
Fig. 2. Remains of attachment organs...        ← paragraph style: "caption"
Legend: (a) — sample CU25/6–16; (b)...        ← paragraph style: "caption source"
Fig. 2. Aspidella-type holdfast fossils...     ← paragraph style: "caption EN"
Legend: (a) — sample CU25/6–16; (b)...        ← paragraph style: "caption source EN"
```

**After** — inline group with figure + styled caption, caption paragraphs removed from story:

![After](https://i.ibb.co/Fk42RWHn/after.png)

```
[inline group: image + caption frame with all styles preserved]
```

---

## Installation

1. Download `CaptionAssembler.jsx`
2. Place it in your InDesign Scripts folder:
   - **Mac:** `~/Library/Application Support/Adobe/InDesign/[version]/[language]/Scripts/Scripts Panel/`
   - **Windows:** `%AppData%\Adobe\InDesign\[version]\[language]\Scripts\Scripts Panel\`
3. Open the Scripts panel in InDesign: **Window → Utilities → Scripts**
4. Double-click `CaptionAssembler` to run

---

## Requirements

- The following **object styles** must exist in your document (names are configurable in the dialog):
  - `Figure` — applied to the graphic frame
  - `Caption` — applied to the caption text frame
  - `Figure Group` — applied to the group

---

## Usage

1. Click on the text frame containing your inline graphics, or select text
2. Run the script from the Scripts panel
3. In the dialog:
   - Select the **paragraph styles** that form your caption block (multi-select with Cmd/Ctrl+click)
   - Choose the three **object styles** from the dropdowns
4. Click **Run**

Your selections are saved automatically and restored on next launch.

---

## Dialog

![CaptionAssembler dialog](https://i.ibb.co/zh1qpLMS/Screenshot-2026-03-08-at-03-20-13.jpg)

- **Caption Block Styles** — all paragraph styles that belong to a caption block. The block ends at the first paragraph with a different style.
- **Image** — object style applied to the graphic frame
- **Caption frame** — object style applied to the caption text frame
- **Group** — object style applied to the resulting group

---

## How caption blocks work

A caption block is a sequence of **consecutive paragraphs** immediately following an inline graphic, each with one of the selected styles. The block ends as soon as a paragraph with a different style is encountered.

**Example — single caption style:**
```
[inline image]
Fig. 1. Description here.   ← "caption" → one-paragraph block
Normal body text continues.
```

**Example — multi-style caption block:**
```
[inline image]
Fig. 2. Main description.           ← "caption"
Legend: (a) — ...; (b) — ...       ← "caption source"
Fig. 2. English translation.        ← "caption EN"
Legend: (a) — ...; (b) — ...       ← "caption source EN"
Normal body text continues.
```

All four paragraphs are treated as one block and placed together into the caption frame.

---

## Tips

- The script processes only the **current story** — the one containing the cursor or selection
- All changes are wrapped in a **single Undo step** — Cmd/Ctrl+Z undoes everything at once
- Settings are saved to `CaptionAssembler_settings.json` next to the script file

---

## License

MIT License © Vlad Ossipov
