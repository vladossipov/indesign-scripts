/*
  CharStyleCollector.jsx for Adobe InDesign

  Description:
  Collects all words with the specified character style
  and places them in a new text frame.

  Release notes:
  1.0 Initial release

  Author: Vlad Ossipov
  Email:  vlad.ossipov@gmail.com

  NOTICE:
  Tested with Adobe InDesign CC 2025 (20.5.2) on macOS.
  This script is provided "as is" without warranty of any kind.

  Released under the MIT License
  http://opensource.org/licenses/mit-license.php

  © 2026 Vlad Ossipov | vladossipov.ru | github.com/vladossipov/indesign-scripts/tree/master/CharStyleCollector

*/

(function () {

    var VERSION = "1.0";

    // ─── Document check ───────────────────────────────────────────────────
    if (app.documents.length === 0) {
        alert("No documents are open.");
        return;
    }

    var doc = app.activeDocument;

    // ─── Get list of character styles ────────────────────────────────────
    var styles = doc.characterStyles;

    if (styles.length <= 1) {
        alert("The document has no character styles.");
        return;
    }

    var styleNames = [];
    for (var i = 0; i < styles.length; i++) {
        if (styles[i].name !== "[No character style]") {
            styleNames.push(styles[i].name);
        }
    }

    // ─── Dialog ───────────────────────────────────────────────────────────
    var result = showDialog(styleNames);
    if (!result) { return; }

    var targetStyleName = result.styleName;
    var separator       = unescapeSeparator(result.separator);
    var separatorRaw    = result.separator;
    var onlyUnique      = result.onlyUnique;
    var caseSensitive   = result.caseSensitive;

    // ─── Word search ──────────────────────────────────────────────────────
    var collectedWords = [];
    var seenWords      = {};
    var stories        = doc.stories;

    for (var s = 0; s < stories.length; s++) {
        var chars = stories[s].characters;

        var wordBuffer = "";
        var inStyle    = false;

        for (var c = 0; c < chars.length; c++) {
            var ch        = chars[c];
            var charValue = ch.contents;

            // Skip InDesign special objects
            if (typeof charValue !== "string" || charValue.length !== 1) { continue; }

            var hasStyle = (ch.appliedCharacterStyle.name === targetStyleName);

            if (hasStyle) {
                inStyle = true;

                if (charValue === " "  || charValue === "\u00A0" ||
                    charValue === "\r" || charValue === "\n") {
                    if (wordBuffer !== "") {
                        pushWord(wordBuffer, collectedWords, seenWords,
                                 onlyUnique, caseSensitive);
                        wordBuffer = "";
                    }
                } else {
                    wordBuffer += charValue;
                }

            } else {
                if (inStyle && wordBuffer !== "") {
                    pushWord(wordBuffer, collectedWords, seenWords,
                             onlyUnique, caseSensitive);
                    wordBuffer = "";
                }
                inStyle = false;
            }
        }

        if (inStyle && wordBuffer !== "") {
            pushWord(wordBuffer, collectedWords, seenWords,
                     onlyUnique, caseSensitive);
        }
    }

    if (collectedWords.length === 0) {
        alert("No words found with style \u00AB" + targetStyleName + "\u00BB.");
        return;
    }

    // ─── Create text frame ─────────────────────────────────────────────
    var resultText = collectedWords.join(separator);

    var page = doc.pages[0];
    var pb   = page.bounds;   // [top, left, bottom, right]

    var frameTop    = pb[2] - 40;
    var frameLeft   = pb[1] + 10;
    var frameBottom = pb[2] - 10;
    var frameRight  = pb[3] - 10;

    var frame = page.textFrames.add({
        geometricBounds: [frameTop, frameLeft, frameBottom, frameRight]
    });

    frame.contents = resultText;
    frame.fit(FitOptions.FRAME_TO_CONTENT);

    app.activeWindow.activePage = page;

    alert("Done!\n" +
          "Words found: " + collectedWords.length + "\n" +
          "Style: \u00AB" + targetStyleName + "\u00BB\n" +
          "Separator: \u00AB" + separatorRaw + "\u00BB");


    // ════════════════════════════════════════════════════════════════════════
    //  ScriptUI Dialog
    // ════════════════════════════════════════════════════════════════════════

    function showDialog(charStyleNames) {

        var DD_W = 200;

        var dlg = new Window("dialog", "CharStyleCollect v" + VERSION);
        dlg.orientation   = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.spacing       = 12;
        dlg.margins       = 16;

        // ── Character Style ───────────────────────────────────────────────
        var stylePanel = dlg.add("panel", undefined, "Character style");
        stylePanel.orientation   = "column";
        stylePanel.alignChildren = ["fill", "top"];
        stylePanel.margins       = [10, 15, 10, 10];
        stylePanel.spacing       = 6;

        var ddStyle = stylePanel.add("dropdownlist", [0, 0, DD_W, 22], charStyleNames);
        ddStyle.alignment = "fill";
        ddStyle.selection = 0;

        // ── Separator ─────────────────────────────────────────────────────
        var sepPanel = dlg.add("panel", undefined, "Separator");
        sepPanel.orientation   = "column";
        sepPanel.alignChildren = ["fill", "top"];
        sepPanel.margins       = [10, 15, 10, 10];
        sepPanel.spacing       = 4;

        var sepField = sepPanel.add("edittext", [0, 0, DD_W, 22], " ");
        sepField.alignment = "fill";
        sepField.helpTip   = "Use \\n for new line, \\t for tab";

        var sepHint = sepPanel.add("statictext", undefined, "\\n = new line,  \\t = tab");
        sepHint.alignment   = ["left", "top"];
        sepHint.graphics.font = ScriptUI.newFont("dialog", "REGULAR", 10);

        // ── Options ───────────────────────────────────────────────────────
        var optPanel = dlg.add("panel", undefined, "Options");
        optPanel.orientation   = "column";
        optPanel.alignChildren = ["left", "top"];
        optPanel.margins       = [10, 15, 10, 10];
        optPanel.spacing       = 6;

        var cbUnique = optPanel.add("checkbox", undefined, "Unique words only");
        cbUnique.value = true;

        var cbCase = optPanel.add("checkbox", undefined, "Case sensitive (deduplication)");
        cbCase.value = false;

        // ── Buttons ────────────────────────────────────────────────────────
        var btnGroup = dlg.add("group");
        btnGroup.orientation = "row";
        btnGroup.alignment   = "right";
        btnGroup.spacing     = 8;

        var btnCancel = btnGroup.add("button", undefined, "Cancel", { name: "cancel" });
        var btnOk     = btnGroup.add("button", undefined, "Run",    { name: "ok"     });
        btnOk.active  = true;

        // ── Footer ─────────────────────────────────────────────────────────
        var divider = dlg.add("panel");
        divider.alignment            = "fill";
        divider.preferredSize.height = 1;

        var footer = dlg.add("group");
        footer.alignment     = "fill";
        footer.alignChildren = ["fill", "center"];

        var footerLeft = footer.add("statictext", undefined, "\u00A9 Vlad Ossipov");
        footerLeft.alignment = ["left", "center"];

        var footerRight = footer.add("statictext", undefined, "vladossipov.ru");
        footerRight.alignment = ["right", "center"];
        footerRight.addEventListener("click", function () {
            try {
                app.doScript("do shell script \"open 'https://vladossipov.ru'\"",
                             ScriptLanguage.APPLESCRIPT_LANGUAGE);
            } catch(e) {
                try {
                    var f = new File(Folder.temp + "/open_url.vbs");
                    f.open("w");
                    f.write("CreateObject(\"WScript.Shell\").Run \"https://vladossipov.ru\"");
                    f.close();
                    f.execute();
                } catch(e2) {}
            }
        });

        // ── Run ────────────────────────────────────────────────────────
        var res = dlg.show();

        if (res !== 1) { return null; }

        return {
            styleName    : charStyleNames[ddStyle.selection.index],
            separator    : sepField.text,
            onlyUnique   : cbUnique.value,
            caseSensitive: cbCase.value
        };
    }


    // ─── Helper functions ─────────────────────────────────────────────────

    function pushWord(word, arr, seen, unique, caseSens) {
        var key = caseSens ? word : word.toLowerCase();
        if (unique) {
            if (!seen[key]) {
                seen[key] = true;
                arr.push(word);
            }
        } else {
            arr.push(word);
        }
    }

    function unescapeSeparator(str) {
        return str
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "\r");
    }

}());
