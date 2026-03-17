/*

  CrossRefAssembler.jsx for Adobe InDesign

  Description:
  Creates Cross-Reference links from numbers inside citations marked by GREP pattern
  to paragraphs styled by selected style, using a named Cross-Reference Format.
  The entire operation is a single Undo step.
  Tested with Adobe InDesign CC 2025 (20.5.2) on macOS.

  Release notes:
  1.0 Initial release

  Author: Vlad Ossipov
  Email:  vlad.ossipov@gmail.com

  NOTICE:
  This script is provided "as is" without warranty of any kind.

  Released under the MIT License
  http://opensource.org/licenses/mit-license.php

  © 2026 Vlad Ossipov | vladossipov.ru | github.com/vladossipov/indesign-scripts/tree/master/CrossRefAssembler

*/

#target indesign

// ════════════════════════════════════════════════════════════
// ScriptUI Диалог
// ════════════════════════════════════════════════════════════

function showDialog(doc) {

    var VERSION = "1.0";

    // ── Собираем список стилей абзаца ─────────────────────────
    var paraStyleNames = [];
    var allParaStyles = doc.allParagraphStyles;
    for (var i = 0; i < allParaStyles.length; i++) {
        paraStyleNames.push(allParaStyles[i].name);
    }
    paraStyleNames.sort();

    // ── Собираем Cross-Reference Formats ─────────────────────
    var xrefFormatNames = [];
    var allFormats = doc.crossReferenceFormats;
    for (var i = 0; i < allFormats.length; i++) {
        try { xrefFormatNames.push(allFormats[i].name); } catch(e) {}
    }
    xrefFormatNames.sort();

    // ── Диалог ────────────────────────────────────────────────
    var dlg = new Window("dialog", "CrossRefAssembler v" + VERSION);
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 12;
    dlg.margins = 16;

    function addDropdown(parent, label, names, defaultName) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.spacing = 8;

        var lbl = row.add("statictext", undefined, label);
        lbl.preferredSize.width = 160;

        var dd = row.add("dropdownlist", [0, 0, 185, 22], names);
        dd.selection = 0;
        for (var n = 0; n < names.length; n++) {
            if (names[n] === defaultName) { dd.selection = n; break; }
        }
        return dd;
    }

    function addTextField(parent, label, defaultValue) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.spacing = 8;

        var lbl = row.add("statictext", undefined, label);
        lbl.preferredSize.width = 160;

        var tf = row.add("edittext", [0, 0, 185, 22], defaultValue);
        return tf;
    }

    var ddPara   = addDropdown(dlg, "Bibliography style:",        paraStyleNames, "LitList");
    var ddFmt;
    if (xrefFormatNames.length > 0) {
        ddFmt = addDropdown(dlg, "Cross-Reference Format:", xrefFormatNames, "LitRef Format");
    } else {
        var row = dlg.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.spacing = 8;
        var lbl = row.add("statictext", undefined, "Cross-Reference Format:");
        lbl.preferredSize.width = 160;
        ddFmt = row.add("dropdownlist", [0, 0, 185, 22], ["— no formats found —"]);
        ddFmt.selection = 0;
        ddFmt.enabled = false;
    }
    var tfPrefix = addTextField(dlg, "Text Anchor Prefix:",       "LitRef_");
    var tfGrep   = addTextField(dlg, "GREP to find Refs in text:", "\\[\\d[\\d,;\\s]*\\]");

    // ── Кнопки ────────────────────────────────────────────────
    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment = "right";
    btnGroup.spacing = 8;

    var btnCancel = btnGroup.add("button", undefined, "Cancel", { name: "cancel" });
    var btnRun    = btnGroup.add("button", undefined, "Run",    { name: "ok" });
    btnRun.active = true;

    // ── Версия и копирайт ─────────────────────────────────────
    var divider = dlg.add("panel");
    divider.alignment = "fill";
    divider.preferredSize.height = 1;

    var footer = dlg.add("group");
    footer.alignment = "fill";
    footer.alignChildren = ["fill", "center"];

    var footerLeft = footer.add("statictext", undefined, "\u00A9 Vlad Ossipov");
    footerLeft.alignment = ["left", "center"];

    var footerRight = footer.add("statictext", undefined, "vladossipov.ru");
    footerRight.alignment = ["right", "center"];
    footerRight.cursor = "hand";
    footerRight.addEventListener("click", function () {
        try {
            // Mac
            app.doScript("do shell script \"open 'https://vladossipov.ru'\"",
                         ScriptLanguage.APPLESCRIPT_LANGUAGE);
        } catch(e) {
            try {
                // Windows
                var f = new File(Folder.temp + "/open_url.vbs");
                f.open("w");
                f.write("CreateObject(\"WScript.Shell\").Run \"https://vladossipov.ru\"");
                f.close();
                f.execute();
            } catch(e2) {}
        }
    });

    // ── Обработчики ───────────────────────────────────────────
    var result = null;

    btnRun.onClick = function () {
        if (!ddPara.selection) {
            alert("Please select a bibliography paragraph style.");
            return;
        }
        if (!ddFmt.selection || !ddFmt.enabled) {
            alert("No Cross-Reference Format selected.\nCreate one via Type → Cross-References → Cross-Reference Formats.");
            return;
        }
        if (tfGrep.text === "") {
            alert("GREP pattern cannot be empty.");
            return;
        }
        result = {
            paraStyleName:  ddPara.selection.text,
            xrefFormatName: ddFmt.selection.text,
            prefix:         tfPrefix.text,
            grepPattern:    tfGrep.text
        };
        dlg.close();
    };

    btnCancel.onClick = function () { dlg.close(); };

    dlg.show();
    return result;
}


// ════════════════════════════════════════════════════════════
// Точка входа
// ════════════════════════════════════════════════════════════

var doc = app.activeDocument;
var settings = showDialog(doc);
if (!settings) exit();

var PARA_STYLE_NAME  = settings.paraStyleName;
var XREF_FORMAT_NAME = settings.xrefFormatName;
var GREP_PATTERN     = settings.grepPattern;
var PREFIX           = settings.prefix;
var CLEAN_OLD        = true;

app.doScript(main, ScriptLanguage.JAVASCRIPT, undefined,
             UndoModes.ENTIRE_SCRIPT, "CrossRefAssembler");


// ════════════════════════════════════════════════════════════
// Основная функция
// ════════════════════════════════════════════════════════════

function main() {

    var doc = app.activeDocument;

    // ── 1. Получаем Cross-Reference Format ───────────────────
    var xrefFormat = null;
    try {
        var f = doc.crossReferenceFormats.itemByName(XREF_FORMAT_NAME);
        if (f.isValid) xrefFormat = f;
    } catch (e) {}

    if (!xrefFormat) {
        alert("Error: Cross-Reference Format «" + XREF_FORMAT_NAME + "» not found.\n" +
              "Create it via Type → Cross-References → Cross-Reference Formats.");
        exit();
    }

    // Сохраняем building blocks формата ДО работы —
    // InDesign при создании CrossReferenceSource может их изменить
    var savedBlocks = saveFormatBlocks(xrefFormat);

    // ── 2. Собираем абзацы ───────────────────────────────────
    var litParas = collectLitListParagraphs(doc, PARA_STYLE_NAME);

    if (litParas.length === 0) {
        alert("Error: no paragraphs with style «" + PARA_STYLE_NAME + "» found.");
        exit();
    }

    // ── 3. Destinations ──────────────────────────────────────
    var destinations = buildDestinations(doc, litParas, PREFIX);

    // ── 4. Чистим старые CR скрипта ──────────────────────────
    if (CLEAN_OLD) {
        removePrefixedCrossRefs(doc, PREFIX);
    }

    // ── 5. GREP-поиск ─────────────────────────────────────────
    app.findGrepPreferences   = NothingEnum.nothing;
    app.changeGrepPreferences = NothingEnum.nothing;
    app.findGrepPreferences.findWhat = GREP_PATTERN;
    var found = doc.findGrep();
    app.findGrepPreferences = NothingEnum.nothing;

    if (found.length === 0) {
        alert("No citation markers found.");
        exit();
    }

    // ── 6. Обрабатываем совпадения (с конца) ─────────────────
    var created  = 0;
    var skipped  = 0;
    var errorLog = [];
    var counter  = 0;

    for (var i = found.length - 1; i >= 0; i--) {
        var matchRange = found[i];

        app.findGrepPreferences = NothingEnum.nothing;
        app.findGrepPreferences.findWhat = "\\d+";
        var numRanges = matchRange.findGrep();
        app.findGrepPreferences = NothingEnum.nothing;

        for (var j = numRanges.length - 1; j >= 0; j--) {
            var num = parseInt(numRanges[j].contents, 10);
            counter++;
            var res = makeCrossRef(doc, numRanges[j], num, destinations, xrefFormat, PREFIX, counter);
            if (res === true)       { created++; }
            else if (res === false) { skipped++; }
            else                    { errorLog.push(res); }
        }
    }

    // Восстанавливаем building blocks формата
    restoreFormatBlocks(xrefFormat, savedBlocks);

    // ── 7. Итоговый отчёт ─────────────────────────────────────
    var msg = "Done!\n\n" +
              "\u2713 Cross-References created: " + created + "\n" +
              "\u2014 Skipped (number out of range): " + skipped;
    if (errorLog.length > 0) {
        msg += "\n\nErrors (" + errorLog.length + "):\n" + errorLog.slice(0, 10).join("\n");
        if (errorLog.length > 10) msg += "\n...and " + (errorLog.length - 10) + " more";
    }
    alert(msg);
}


// ════════════════════════════════════════════════════════════
// Вспомогательные функции
// ════════════════════════════════════════════════════════════

function saveFormatBlocks(fmt) {
    var saved = [];
    var bbs = fmt.buildingBlocks;
    for (var i = 0; i < bbs.length; i++) {
        try {
            saved.push({
                blockType:  bbs[i].blockType,
                customText: bbs[i].customText || "",
                charStyle:  bbs[i].appliedCharacterStyle
            });
        } catch(e) {}
    }
    return saved;
}

function restoreFormatBlocks(fmt, saved) {
    var bbs = fmt.buildingBlocks;
    for (var i = bbs.length - 1; i >= 0; i--) {
        try { bbs[i].remove(); } catch(e) {}
    }
    for (var i = 0; i < saved.length; i++) {
        try {
            var bb = fmt.buildingBlocks.add(
                saved[i].blockType,
                CrossReferenceFormats.AT_END,
                saved[i].customText
            );
            if (saved[i].charStyle) {
                try { bb.appliedCharacterStyle = saved[i].charStyle; } catch(e) {}
            }
        } catch(e) {}
    }
}

function collectLitListParagraphs(doc, styleName) {
    var result = [];
    var stories = doc.stories;
    for (var s = 0; s < stories.length; s++) {
        var paras = stories[s].paragraphs;
        for (var p = 0; p < paras.length; p++) {
            try {
                if (paras[p].appliedParagraphStyle.name === styleName) {
                    result.push(paras[p]);
                }
            } catch (e) {}
        }
    }
    return result;
}

function buildDestinations(doc, litParas, prefix) {
    var dests = [];
    for (var i = 0; i < litParas.length; i++) {
        var destName = prefix + "Dest_" + (i + 1);
        var dest = null;
        try {
            var ex = doc.hyperlinkTextDestinations.itemByName(destName);
            if (ex.isValid) dest = ex;
        } catch (e) {}
        if (!dest) {
            try {
                dest = doc.hyperlinkTextDestinations.add(
                    litParas[i].characters[0],
                    { name: destName }
                );
            } catch (e) {}
        }
        dests.push(dest);
    }
    return dests;
}

function removePrefixedCrossRefs(doc, prefix) {
    var i;
    var hls = doc.hyperlinks;
    for (i = hls.length - 1; i >= 0; i--) {
        try { if (hls[i].name.indexOf(prefix + "HL_") === 0) hls[i].remove(); } catch(e) {}
    }
    var srcs = doc.crossReferenceSources;
    for (i = srcs.length - 1; i >= 0; i--) {
        try { if (srcs[i].name.indexOf(prefix + "Src_") === 0) srcs[i].remove(); } catch(e) {}
    }
}

function makeCrossRef(doc, numRange, num, destinations, xrefFormat, prefix, counter) {
    if (isNaN(num) || num < 1 || num > destinations.length) {
        return false;
    }
    var dest = destinations[num - 1];
    if (!dest) { return "No destination for number " + num; }
    try {
        var src = doc.crossReferenceSources.add(
            numRange,
            xrefFormat,
            { name: prefix + "Src_" + counter }
        );
        var hl = doc.hyperlinks.add(src, dest, { name: prefix + "HL_" + counter });
        hl.visible = false;
        return true;
    } catch (e) {
        return "Error for [" + num + "]: " + e.message;
    }
}
