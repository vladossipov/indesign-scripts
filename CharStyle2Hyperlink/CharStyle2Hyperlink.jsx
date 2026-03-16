/*

  CharStyle2Hyperlink.jsx for Adobe InDesign

  Description:
  Finds all text runs with a specified character style and converts them
  into clickable hyperlinks. The URL is taken directly from the text content.
  Supports processing the entire document, a single text frame, or a selected
  text range. Skipped and failed items are reported with page numbers.

  Release notes:
  1.01 Fixed: scope radio buttons were placed in a group instead of a panel,
       causing incorrect scope detection (frame story selected instead of entire document)
  1.0 Initial release

  Author: Vlad Ossipov
  Email:  vlad.ossipov@gmail.com

  NOTICE:
  Tested with Adobe InDesign CC 2025 (20.5.2) on macOS.
  This script is provided "as is" without warranty of any kind.

  Released under the MIT License
  http://opensource.org/licenses/mit-license.php

  © 2026 Vlad Ossipov | vladossipov.ru | github.com/vladossipov/CharStyle2Hyperlink

*/

#target indesign

(function () {

    // ── 0. Проверка документа ────────────────────────────────────────────────
    if (app.documents.length === 0) {
        alert("No open documents.");
        return;
    }
    var doc = app.activeDocument;

    // ── 1. Собираем список символьных стилей ─────────────────────────────────
    var charStyleNames = [];
    var styles = doc.characterStyles;
    for (var i = 0; i < styles.length; i++) {
        var n = styles[i].name;
        if (n !== "[None]") charStyleNames.push(n);
    }

    if (charStyleNames.length === 0) {
        alert("No character styles found in the document.");
        return;
    }

    // ── 2. Диалог ────────────────────────────────────────────────────────────
    var result = showDialog(charStyleNames);
    if (!result) return;

    // ── 3. Поиск символьного стиля ───────────────────────────────────────────
    var charStyle;
    try {
        charStyle = doc.characterStyles.itemByName(result.styleName);
        if (!charStyle.isValid) throw new Error();
    } catch (e) {
        alert("Character style \"" + result.styleName + "\" not found.");
        return;
    }

    // ── 4. Область поиска ────────────────────────────────────────────────────
    var searchTarget = getSearchTarget(doc, result.scope);
    if (searchTarget === null) return;

    // ── 5. Поиск текста ──────────────────────────────────────────────────────
    app.findTextPreferences = NothingEnum.nothing;
    app.findTextPreferences.appliedCharacterStyle = charStyle;

    var found = searchTarget.findText(result.scope === "document");

    app.findTextPreferences = NothingEnum.nothing;

    if (found.length === 0) {
        alert("No text with style \"" + result.styleName + "\" found.");
        return;
    }

    // Дедупликация: findText может вернуть один и тот же объект дважды
    // при наложении символьных стилей — фильтруем по уникальному ключу
    var seen = {};
    var unique = [];
    for (var k = 0; k < found.length; k++) {
        try {
            var key = found[k].parentStory.index + ":" + found[k].index;
            if (!seen[key]) { seen[key] = true; unique.push(found[k]); }
        } catch(e) { unique.push(found[k]); }
    }
    found = unique;

    // ── 6. Создание гиперссылок — обёрнуто в один Undo ──────────────────────
    var created = 0, skipped = [], errors = [];

    app.doScript(function () {

        for (var j = 0; j < found.length; j++) {
            var textObj = found[j];
            var url     = trimStr(textObj.contents);
            var pageNum = getPageNum(textObj);

            if (!isURL(url)) {
                skipped.push(url + " --- page " + pageNum);
                continue;
            }

            try {
                var dest = getOrCreateDestination(doc, url);
                var src  = doc.hyperlinkTextSources.add(textObj);
                doc.hyperlinks.add(src, dest, {
                    name   : makeUniqueName(doc, url),
                    visible: false
                });
                created++;
            } catch (e) {
                errors.push(url + " --- page " + pageNum + " (" + e.message + ")");
            }
        }

    }, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Create Hyperlinks from Style");

    // ── 7. Отчёт ─────────────────────────────────────────────────────────────
    var scopeLabel = result.scope === "document"  ? "entire document"
                   : result.scope === "frame"     ? "current frame story"
                   :                                "selected text";

    showReport(scopeLabel, created, skipped, errors);

})();


// ════════════════════════════════════════════════════════════════════════════
//  ScriptUI Диалог
// ════════════════════════════════════════════════════════════════════════════

function showDialog(charStyleNames) {

    var VERSION = "1.0";
    var LABEL_W = 140;
    var DD_W    = 150;   

    var VERSION = "1.01";

    var dlg = new Window("dialog", "CharStyle2Hyperlink v" + VERSION);
    dlg.orientation    = "column";
    dlg.alignChildren  = ["fill", "top"];
    dlg.spacing        = 10;
    dlg.margins        = 16;

    // ── Вспомогательная функция для строки label + control ───────────────────
    function addRow(parent) {
        var row = parent.add("group");
        row.orientation   = "row";
        row.alignChildren = ["left", "center"];
        row.spacing       = 8;
        return row;
    }

    function addLabel(row, text) {
        var lbl = row.add("statictext", undefined, text);
        lbl.preferredSize.width = LABEL_W;
        return lbl;
    }

    function addDropdown(parent, label, items, defaultItem) {
        var row = addRow(parent);
        addLabel(row, label);
        var dd = row.add("dropdownlist", [0, 0, DD_W, 22], items);
        dd.selection = 0;
        for (var i = 0; i < items.length; i++) {
            if (items[i] === defaultItem) { dd.selection = i; break; }
        }
        return dd;
    }

    // ── Character Style ───────────────────────────────────────────────────────
    var ddStyle = addDropdown(dlg, "Character style:", charStyleNames, "Hyperlink");

    // ── Scope ─────────────────────────────────────────────────────────────────
    var scopeRow = addRow(dlg);
    addLabel(scopeRow, "Scope:");

    var rbPanel  = scopeRow.add("panel");
    rbPanel.orientation  = "column";
    rbPanel.alignChildren = ["left", "center"];
    rbPanel.spacing = 4;
    rbPanel.margins = [8, 6, 8, 6];
    rbPanel.borderStyle = "none";

    var rbDoc   = rbPanel.add("radiobutton", undefined, "Entire document");
    var rbFrame = rbPanel.add("radiobutton", undefined, "Current frame story");
    var rbSel   = rbPanel.add("radiobutton", undefined, "Selected text");
    rbDoc.value = true;

    // ── Кнопки ────────────────────────────────────────────────────────────────
    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment   = "right";
    btnGroup.spacing     = 8;

    var btnCancel = btnGroup.add("button", undefined, "Cancel", { name: "cancel" });
    var btnOk     = btnGroup.add("button", undefined, "Run",    { name: "ok"     });
    btnOk.active  = true;

    // ── Футер ─────────────────────────────────────────────────────────────────
    var divider = dlg.add("panel");
    divider.alignment           = "fill";
    divider.preferredSize.height = 1;

    var footer = dlg.add("group");
    footer.alignment      = "fill";
    footer.alignChildren  = ["fill", "center"];

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
                f.open("w"); f.write("CreateObject(\"WScript.Shell\").Run \"https://vladossipov.ru\""); f.close(); f.execute();
            } catch(e2) {}
        }
    });

    // ── Обработчики ───────────────────────────────────────────────────────────
    var result = null;

    btnOk.onClick = function () {
        if (!ddStyle.selection) { alert("Please select a character style."); return; }

        // Читаем scope ДО закрытия диалога — после close() значения радиокнопок
        // могут быть сброшены в некоторых версиях InDesign
        var scope = "document";
        if (rbFrame.value) scope = "frame";
        if (rbSel.value)   scope = "selection";

        result = {
            styleName: ddStyle.selection.text,
            scope    : scope
        };
        dlg.close();
    };

    btnCancel.onClick = function () { dlg.close(); };

    dlg.show();
    return result;
}


// ════════════════════════════════════════════════════════════════════════════
//  Область поиска
// ════════════════════════════════════════════════════════════════════════════

function getSearchTarget(doc, scope) {

    if (scope === "document") return doc;

    if (scope === "frame") {
        var frame = null;

        try {
            var sel = app.selection;
            if (sel && sel.length > 0) {
                var item = sel[0];
                if (item.constructor.name === "TextFrame") {
                    frame = item;
                } else if (item.hasOwnProperty("parentTextFrames") && item.parentTextFrames.length > 0) {
                    frame = item.parentTextFrames[0];
                }
            }
        } catch(e) {}

        if (!frame) {
            alert("Could not determine the current frame story.\nClick inside a text frame (or select it) and try again.");
            return null;
        }
        // Обрабатываем всю story — все связанные фреймы
        return frame.parentStory;
    }

    if (scope === "selection") {
        var sel = app.selection;
        if (!sel || sel.length === 0) {
            alert("No text selected.\nSelect a text range and try again.");
            return null;
        }
        var item = sel[0];
        if (item.hasOwnProperty("contents") && item.hasOwnProperty("appliedCharacterStyle")) return item;
        if (item.constructor.name === "TextFrame") return item.texts[0];
        alert("Please select a text range (not an object) and try again.");
        return null;
    }

    return doc;
}


// ════════════════════════════════════════════════════════════════════════════
//  Утилиты
// ════════════════════════════════════════════════════════════════════════════

function trimStr(s) {
    // Убираем leading/trailing пробелы и неразрывные пробелы
    s = s.replace(/^[\s\u00A0\uFEFF]+|[\s\u00A0\uFEFF]+$/g, "");
    // Убираем внутренние разрывы строк — InDesign вставляет soft return (\u000B)
    // в середину длинных URL при переносе строки, что обрезает ссылку
    s = s.replace(/[\r\n\u000B\u000C\u2028\u2029]+/g, "");
    return s;
}

function isURL(s) {
    return /^(https?:\/\/|mailto:|tel:|www\.)\S+/i.test(s);
}

function getOrCreateDestination(doc, url) {
    var dests = doc.hyperlinkURLDestinations;
    for (var i = 0; i < dests.length; i++) {
        if (dests[i].destinationURL === url) return dests[i];
    }
    return dests.add({ name: url, destinationURL: url, hidden: false });
}

function makeUniqueName(doc, url) {
    var base = url.replace(/^https?:\/\/(www\.)?/, "").substring(0, 50);
    var name = base, idx = 1;
    while (doc.hyperlinks.itemByName(name).isValid) {
        name = base + "_" + (idx++);
    }
    return name;
}


// ════════════════════════════════════════════════════════════════════════════
//  Номер страницы для текстового объекта
// ════════════════════════════════════════════════════════════════════════════

function getPageNum(textObj) {
    try {
        var frames = textObj.parentTextFrames;
        if (frames && frames.length > 0) {
            var page = frames[0].parentPage;
            if (page && page.isValid) return page.name;
        }
    } catch (e) {}
    return "?";
}


// ════════════════════════════════════════════════════════════════════════════
//  Диалог отчёта с прокручиваемыми textarea
// ════════════════════════════════════════════════════════════════════════════

function showReport(scopeLabel, created, skipped, errors) {

    var hasIssues = skipped.length > 0 || errors.length > 0;

    var dlg = new Window("dialog", "Report");
    dlg.orientation   = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing       = 10;
    dlg.margins       = 16;
    dlg.preferredSize.width = 480;

    // Заголовок — статистика
    var header = dlg.add("group");
    header.orientation   = "row";
    header.alignChildren = ["left", "center"];
    header.spacing       = 20;

    var lblScope = header.add("statictext", undefined, "Scope: " + scopeLabel);
    lblScope.alignment = ["left", "center"];

    var lblCreated = header.add("statictext", undefined, "✅ Created: " + created);
    lblCreated.alignment = ["left", "center"];

    if (skipped.length) {
        var lblSkipped = header.add("statictext", undefined, "⚠️ Skipped: " + skipped.length);
        lblSkipped.alignment = ["left", "center"];
    }
    if (errors.length) {
        var lblErrors = header.add("statictext", undefined, "❌ Errors: " + errors.length);
        lblErrors.alignment = ["left", "center"];
    }

    // Секция Skipped
    if (skipped.length > 0) {
        var grpSkipped = dlg.add("group");
        grpSkipped.orientation   = "column";
        grpSkipped.alignChildren = ["fill", "top"];
        grpSkipped.spacing       = 4;
        grpSkipped.alignment     = "fill";

        var lblSkipTitle = grpSkipped.add("statictext", undefined, "\u26A0\uFE0F  Skipped \u2014 not a URL (" + skipped.length + "):");
        var lblSkipDesc = grpSkipped.add("statictext", [0, 0, 450, 40],
            "These text runs had the character style applied but their content is not a valid URL " +
            "(doesn\u2019t start with http://, https://, mailto:, tel: or www.).",
            { multiline: true });
        lblSkipDesc.alignment = "fill";

        var taSkipped = grpSkipped.add("edittext", [0, 0, 450, 100], skipped.join("\n"), {
            multiline: true,
            scrolling: true,
            readonly : true
        });
        taSkipped.alignment = "fill";
    }

    // Секция Errors
    if (errors.length > 0) {
        var grpErrors = dlg.add("group");
        grpErrors.orientation   = "column";
        grpErrors.alignChildren = ["fill", "top"];
        grpErrors.spacing       = 4;
        grpErrors.alignment     = "fill";

        var lblErrTitle = grpErrors.add("statictext", undefined, "\u274C  Errors (" + errors.length + "):");
        var lblErrDesc = grpErrors.add("statictext", [0, 0, 450, 40],
            "These URLs were valid but a hyperlink could not be created \u2014 most likely because " +
            "the text is already used as a hyperlink source in this document.",
            { multiline: true });
        lblErrDesc.alignment = "fill";

        var taErrors = grpErrors.add("edittext", [0, 0, 450, 100], errors.join("\n"), {
            multiline: true,
            scrolling: true,
            readonly : true
        });
        taErrors.alignment = "fill";
    }

    // Кнопка OK
    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment   = "right";
    var btnOk = btnGroup.add("button", undefined, "OK", { name: "ok" });
    btnOk.active = true;
    btnOk.onClick = function () { dlg.close(); };

    dlg.show();
}
