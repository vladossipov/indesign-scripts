/*

  CaptionAssembler.jsx for Adobe InDesign

  Description:
  Finds inline graphics in the current Story followed by caption paragraphs,
  creates a caption text frame, transfers the caption text with all paragraph
  styles, groups the figure with its caption frame, and places the group
  back inline into the text flow with the specified group object style.

  Release notes:
  1.1 Added checkbox to apply Image style to inline images without a caption
  1.0 Initial release

  Author: Vlad Ossipov
  Email:  vlad.ossipov@gmail.com

  NOTICE:
  Tested with Adobe InDesign CC 2025 (20.5.2) on macOS.
  This script is provided "as is" without warranty of any kind.

  Released under the MIT License
  http://opensource.org/licenses/mit-license.php

  © 2026 Vlad Ossipov | github.com/vladossipov/CaptionAssembler

*/

#target indesign
#targetengine main

(function () {
    "use strict";

    if (!app.documents.length)  { alert("No open documents."); return; }
    if (!app.selection.length)  { alert("Please select a text frame."); return; }

    var doc   = app.activeDocument;
    var story = getStory(app.selection[0]);
    if (!story) { alert("Selection does not contain a text Story."); return; }

    // ── Файл настроек рядом со скриптом ──────────────────────────────────────
    var settingsFile = new File($.fileName.replace(/\.jsx$/i, "_settings.json"));

    // ── Дефолтные значения ───────────────────────────────────────────────────
    var DEFAULT_CAPTION_STYLES = [
        "caption", "caption bold", "caption italic",
        "caption source", "caption number", "caption credit"
    ];
    var DEFAULT_FIGURE_STYLE  = "Figure";
    var DEFAULT_CAPTION_STYLE = "Caption 1";
    var DEFAULT_GROUP_STYLE   = "Figuregroup";

    // ── Загружаем сохранённые настройки (если есть) ──────────────────────────
    var saved = loadSettings(settingsFile);
    var initCaptionStyles = saved ? saved.captionStyles : DEFAULT_CAPTION_STYLES;
    var initFigureStyle   = saved ? saved.figureStyle   : DEFAULT_FIGURE_STYLE;
    var initCaptionStyle  = saved ? saved.captionStyle  : DEFAULT_CAPTION_STYLE;
    var initGroupStyle    = saved ? saved.groupStyle     : DEFAULT_GROUP_STYLE;

    var initProcessAlone  = saved ? (saved.processAlone || false) : false;

    // ── Собираем списки стилей из документа ──────────────────────────────────
    var paraStyleNames = [];
    try {
        var ps = doc.paragraphStyles.everyItem().getElements();
        for (var i = 0; i < ps.length; i++)
            if (ps[i].name !== "[No Paragraph Style]") paraStyleNames.push(ps[i].name);
    } catch(e) {}

    var objStyleNames = [];
    try {
        var os = doc.objectStyles.everyItem().getElements();
        for (var i = 0; i < os.length; i++)
            if (os[i].name !== "[None]" && os[i].name !== "[Normal Graphics Frame]" &&
                os[i].name !== "[Normal Text Frame]" && os[i].name !== "[Normal Grid]")
                objStyleNames.push(os[i].name);
    } catch(e) {}

    // ── Показываем диалог ─────────────────────────────────────────────────────
    var settings = showDialog(paraStyleNames, objStyleNames,
                              initCaptionStyles, initFigureStyle,
                              initCaptionStyle,  initGroupStyle, initProcessAlone);
    if (!settings) return; // отмена

    // ── Сохраняем настройки ───────────────────────────────────────────────────
    saveSettings(settingsFile, settings);

    // ── Получаем объектные стили ──────────────────────────────────────────────
    var figureStyle = doc.objectStyles.itemByName(settings.figureStyle);
    if (!figureStyle.isValid)  { alert("Object style «" + settings.figureStyle + "» not found.");  return; }
    var captionStyle = doc.objectStyles.itemByName(settings.captionStyle);
    if (!captionStyle.isValid) { alert("Object style «" + settings.captionStyle + "» not found."); return; }
    var groupStyle = doc.objectStyles.itemByName(settings.groupStyle);
    if (!groupStyle.isValid)   { alert("Object style «" + settings.groupStyle + "» not found.");   return; }

    // ── Сбор пар ─────────────────────────────────────────────────────────────
    var pairs = collectPairs(story, settings.captionStyles);

    // ── Сбор одиночных (без подрисуночной) ───────────────────────────────────
    var solos = settings.processAlone ? collectSolos(story, settings.captionStyles) : [];

    if (!pairs.length && !solos.length) {
        alert("No inline graphics found for processing.");
        return;
    }

    // ── Обработка ─────────────────────────────────────────────────────────────
    app.doScript(function () {
        var ok = 0, fail = 0, errors = [];

        // Пары с подрисуночной — в обратном порядке
        for (var k = pairs.length - 1; k >= 0; k--) {
            try {
                processPair(pairs[k], doc, figureStyle, captionStyle, groupStyle);
                ok++;
            } catch (e) {
                fail++;
                errors.push("Пара #" + k + ": " + e.message);
            }
        }

        // Одиночные — просто применяем стиль Figure
        for (var s = solos.length - 1; s >= 0; s--) {
            try {
                solos[s].appliedObjectStyle = figureStyle;
                ok++;
            } catch (e) {
                fail++;
                errors.push("Одиночная #" + s + ": " + e.message);
            }
        }

        var msg = "Done!\nProcessed: " + ok;
        if (fail) msg += "\nErrors: " + fail + "\n\n" + errors.join("\n");
        alert(msg);
    }, ScriptLanguage.JAVASCRIPT, undefined,
       UndoModes.ENTIRE_SCRIPT, "CaptionAssembler");

})();


// ═══════════════════════════════════════════════════════════════════════════════
// Сохранение / загрузка настроек
// ═══════════════════════════════════════════════════════════════════════════════

function saveSettings(file, settings) {
    try {
        // Простая JSON-сериализация без JSON.stringify (ExtendScript ES3)
        var lines = [];
        lines.push("{");
        lines.push("  \"figureStyle\": " + jsonStr(settings.figureStyle) + ",");
        lines.push("  \"captionStyle\": " + jsonStr(settings.captionStyle) + ",");
        lines.push("  \"groupStyle\": " + jsonStr(settings.groupStyle) + ",");
        lines.push("  \"processAlone\": " + (settings.processAlone ? "true" : "false") + ",");
        lines.push("  \"captionStyles\": [");
        for (var i = 0; i < settings.captionStyles.length; i++) {
            var comma = i < settings.captionStyles.length - 1 ? "," : "";
            lines.push("    " + jsonStr(settings.captionStyles[i]) + comma);
        }
        lines.push("  ]");
        lines.push("}");

        file.encoding = "UTF-8";
        file.open("w");
        file.write(lines.join("\n"));
        file.close();
    } catch(e) {}
}

function loadSettings(file) {
    try {
        if (!file.exists) return null;
        file.encoding = "UTF-8";
        file.open("r");
        var raw = file.read();
        file.close();

        // Простой парсинг без JSON.parse
        var result = {};

        // figureStyle, captionStyle, groupStyle
        var fields = ["figureStyle", "captionStyle", "groupStyle"];
        for (var f = 0; f < fields.length; f++) {
            var re = new RegExp('"' + fields[f] + '"\\s*:\\s*"([^"]*)"');
            var m  = raw.match(re);
            if (m) result[fields[f]] = m[1];
        }

        // processAlone boolean
        var aloneMatch = raw.match(/"processAlone"\s*:\s*(true|false)/);
        result.processAlone = aloneMatch ? (aloneMatch[1] === "true") : false;

        // captionStyles массив
        var arrMatch = raw.match(/"captionStyles"\s*:\s*\[([^\]]*)\]/);
        if (arrMatch) {
            var items = arrMatch[1].match(/"([^"]*)"/g);
            result.captionStyles = [];
            if (items) {
                for (var i = 0; i < items.length; i++)
                    result.captionStyles.push(items[i].replace(/"/g, ""));
            }
        }

        if (result.figureStyle && result.captionStyle && result.groupStyle && result.captionStyles)
            return result;
    } catch(e) {}
    return null;
}

function jsonStr(s) {
    return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}


// ═══════════════════════════════════════════════════════════════════════════════
// ScriptUI Диалог
// ═══════════════════════════════════════════════════════════════════════════════

function showDialog(paraStyleNames, objStyleNames,
                    defaultCaptionStyles, defaultFigureStyle,
                    defaultCaptionStyle, defaultGroupStyle, defaultProcessAlone) {

    var VERSION = "1.1";

    var dlg = new Window("dialog", "CaptionAssembler v" + VERSION);
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 12;
    dlg.margins = 16;

    // ── Секция: абзацные стили подрисуночного блока ──────────────────────────
    var capPanel = dlg.add("panel", undefined, "Caption Block Styles");
    capPanel.orientation = "column";
    capPanel.alignChildren = ["fill", "top"];
    capPanel.margins = [10, 15, 10, 10];
    capPanel.spacing = 6;

    capPanel.add("statictext", undefined, "Select paragraph styles (Cmd/Ctrl+click for multi-select):");

    var listBox = capPanel.add("listbox", [0, 0, 320, 160], paraStyleNames,
                               { multiselect: true });

    // Выделяем дефолтные стили
    for (var i = 0; i < listBox.items.length; i++) {
        var itemName = listBox.items[i].text;
        for (var d = 0; d < defaultCaptionStyles.length; d++) {
            if (defaultCaptionStyles[d] === itemName) {
                listBox.items[i].selected = true;
                break;
            }
        }
    }

    // ── Секция: объектные стили ───────────────────────────────────────────────
    var stylePanel = dlg.add("panel", undefined, "Object Styles");
    stylePanel.orientation = "column";
    stylePanel.alignChildren = ["fill", "top"];
    stylePanel.margins = [10, 15, 10, 10];
    stylePanel.spacing = 8;

    function addDropdown(parent, label, names, defaultName) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.spacing = 8;

        var lbl = row.add("statictext", undefined, label);
        lbl.preferredSize.width = 110;

        var dd = row.add("dropdownlist", [0, 0, 200, 22], names);
        dd.selection = 0;
        for (var n = 0; n < names.length; n++) {
            if (names[n] === defaultName) { dd.selection = n; break; }
        }
        return dd;
    }

    var ddFigure  = addDropdown(stylePanel, "Image:",          objStyleNames, defaultFigureStyle);
    var ddCaption = addDropdown(stylePanel, "Caption frame:",  objStyleNames, defaultCaptionStyle);
    var ddGroup   = addDropdown(stylePanel, "Group:",          objStyleNames, defaultGroupStyle);

    // ── Checkbox: process graphics without caption ────────────────────────────
    var chkAlone = dlg.add("checkbox", undefined, "Apply Image style to inline images without a caption");
    chkAlone.value = defaultProcessAlone || false;

    // ── Кнопки ────────────────────────────────────────────────────────────────
    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment = "right";
    btnGroup.spacing = 8;

    var btnCancel = btnGroup.add("button", undefined, "Cancel",  { name: "cancel" });
    var btnOk     = btnGroup.add("button", undefined, "Run", { name: "ok" });
    btnOk.active  = true;

    // ── Версия и копирайт ─────────────────────────────────────────────────────
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

    var result = null;

    btnOk.onClick = function () {
        // Собираем выбранные абзацные стили
        var selectedStyles = [];
        for (var i = 0; i < listBox.items.length; i++)
            if (listBox.items[i].selected) selectedStyles.push(listBox.items[i].text);

        if (!selectedStyles.length) {
            alert("Please select at least one caption paragraph style.");
            return;
        }
        if (!ddFigure.selection || !ddCaption.selection || !ddGroup.selection) {
            alert("Please select all three object styles.");
            return;
        }

        result = {
            captionStyles:  selectedStyles,
            figureStyle:    ddFigure.selection.text,
            captionStyle:   ddCaption.selection.text,
            groupStyle:     ddGroup.selection.text,
            processAlone:   chkAlone.value
        };
        dlg.close();
    };

    btnCancel.onClick = function () { dlg.close(); };

    dlg.show();
    return result;
}


// ═══════════════════════════════════════════════════════════════════════════════
// Сбор пар
// ═══════════════════════════════════════════════════════════════════════════════

function getStory(sel) {
    try {
        if (sel instanceof TextFrame)           return sel.parentStory;
        if (sel.hasOwnProperty("parentStory")) return sel.parentStory;
        if (sel instanceof Story)              return sel;
    } catch(e) {}
    return null;
}

function isCaptionStyle(para, captionStyles) {
    try {
        var name = para.appliedParagraphStyle.name;
        for (var i = 0; i < captionStyles.length; i++)
            if (captionStyles[i] === name) return true;
    } catch(e) {}
    return false;
}

function collectPairs(story, captionStyles) {
    var pairs = [];
    var paras = story.paragraphs;
    var len   = paras.length;

    for (var i = 0; i < len - 1; i++) {
        var para = paras[i];
        var item = getInlineItem(para);
        if (!item) continue;

        var captionParas = [];
        var j = i + 1;
        while (j < len && isCaptionStyle(paras[j], captionStyles)) {
            captionParas.push(paras[j]);
            j++;
        }
        if (!captionParas.length) continue;

        var anchorCharIndex = -1;
        try { anchorCharIndex = item.parent.index; } catch(e) { continue; }

        pairs.push({
            graphic:       item,
            captionParas:  captionParas,
            anchorCharIdx: anchorCharIndex,
            story:         story
        });

        i = j - 1;
    }
    return pairs;
}

function getInlineItem(para) {
    var items;
    try { items = para.allPageItems; } catch(e) { return null; }
    if (!items || !items.length) return null;
    for (var j = 0; j < items.length; j++) {
        var pi = items[j];
        if (!pi.isValid) continue;
        try {
            var pos = pi.anchoredObjectSettings.anchoredPosition;
            if (pos === AnchorPosition.INLINE_POSITION || pos === AnchorPosition.ABOVE_LINE)
                return pi;
        } catch(e) {}
    }
    return null;
}


// Собирает inline-графику БЕЗ последующего caption-блока
function collectSolos(story, captionStyles) {
    var solos = [];
    var paras  = story.paragraphs;
    var len    = paras.length;

    for (var i = 0; i < len; i++) {
        var item = getInlineItem(paras[i]);
        if (!item) continue;

        // Проверяем следующий абзац — если caption-стиль, это пара, пропускаем
        var nextIsCaption = false;
        if (i + 1 < len) nextIsCaption = isCaptionStyle(paras[i + 1], captionStyles);
        if (nextIsCaption) continue;

        solos.push(item);
    }
    return solos;
}


// ═══════════════════════════════════════════════════════════════════════════════
// Обработка пары
// ═══════════════════════════════════════════════════════════════════════════════

function processPair(pair, doc, figureStyle, captionStyle, groupStyle) {
    var graphicFrame  = pair.graphic;
    var captionParas  = pair.captionParas;
    var anchorCharIdx = pair.anchorCharIdx;
    var story         = pair.story;

    if (!graphicFrame.isValid)    throw new Error("graphicFrame invalid.");
    if (!captionParas[0].isValid) throw new Error("captionPara invalid.");

    // 1. Читаем текст и стили из captionParas ДО любых изменений
    var captionBlocks = [];
    for (var ci = 0; ci < captionParas.length; ci++) {
        try {
            var cp = captionParas[ci];
            captionBlocks.push({
                text:      cp.contents.replace(/[\r\n]+$/, ""),
                styleName: cp.appliedParagraphStyle.name
            });
        } catch(e) {}
    }

    // 2. Figure style
    graphicFrame.appliedObjectStyle = figureStyle;

    // 3. Страница
    var targetPage = graphicFrame.parentPage;
    if (!targetPage || !targetPage.isValid)
        targetPage = graphicFrame.parent.pages[0];
    if (!targetPage || !targetPage.isValid) throw new Error("Could not determine the page.");

    // 4. Cut из story → pasteInPlace
    app.select(graphicFrame);
    app.cut();
    app.selection = NothingEnum.nothing;
    app.activeWindow.activePage = targetPage;
    app.pasteInPlace();

    var pastedFrame = app.selection[0];
    if (!pastedFrame || !pastedFrame.isValid) throw new Error("pasteInPlace: no selection.");

    // 5. Создаём TextFrame вручную под графикой — берём bounds с pastedFrame
    var gb = pastedFrame.geometricBounds; // [top, left, bottom, right]

    var frameTop    = gb[2];       // bottom графики = top caption фрейма
    var frameLeft   = gb[1];
    var frameBottom = gb[2] + 20;  // начальная высота, вырастет по fit
    var frameRight  = gb[3];

    var captionFrame = targetPage.textFrames.add({
        geometricBounds: [frameTop, frameLeft, frameBottom, frameRight]
    });

    // 6. Применяем object style к caption frame
    try { captionFrame.appliedObjectStyle = captionStyle; } catch(e) {}

    // 7. Заполняем текстом
    try {
        var tfStory = captionFrame.parentStory;

        var fullText = "";
        for (var bi = 0; bi < captionBlocks.length; bi++) {
            if (bi > 0) fullText += "\r";
            fullText += captionBlocks[bi].text;
        }
        tfStory.insertionPoints[0].contents = fullText;

        // Применяем абзацные стили
        var storyParas = tfStory.paragraphs;
        for (var si = 0; si < captionBlocks.length; si++) {
            try {
                var namedStyle = doc.paragraphStyles.itemByName(captionBlocks[si].styleName);
                if (namedStyle.isValid)
                    storyParas.item(si).appliedParagraphStyle = namedStyle;
            } catch(e) {}
        }

        // Подгоняем высоту фрейма под текст
        try { captionFrame.fit(FitOptions.FRAME_TO_CONTENT); } catch(e) {}
    } catch(e) {}

    // 8. Группируем графику + caption frame
    var newGroup = doc.groups.add([pastedFrame, captionFrame]);

    // 9. Стиль Figuregroup ДО вставки в текст
    newGroup.appliedObjectStyle = groupStyle;

    // 10. Cut группы → paste inline в story
    app.select(newGroup);
    app.cut();

    var ip = story.insertionPoints.item(anchorCharIdx);
    if (!ip || !ip.isValid) throw new Error("insertionPoint[" + anchorCharIdx + "] invalid.");
    app.select(ip);
    app.paste();

    // 11. Удаляем caption-абзацы из story
    for (var d = captionParas.length - 1; d >= 0; d--) {
        try { if (captionParas[d].isValid) captionParas[d].remove(); } catch(e) {}
    }
}


