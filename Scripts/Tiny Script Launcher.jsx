/**
 * Tiny Script Launcher
 * 
 * Version: 1.0
 * Last Update: March 1st 2025
 *
 * Code by Claude 3.7
 * Curated by @crinzip / http://crin.zip
 * 
 * This script is provided "as is," without warranty of any kind, expressed
 * or implied. In no event shall the author be held liable for any damages.
 *
 * Installation: 
 * 1. Save to "ScriptUI Panels" subfolder of your After Effects Scripts folder
 * 2. Restart After Effects or refresh panels
 * 3. Find in the Window menu as "Script Launcher"
 * 
 */

(function(thisObj) {
    var scriptPath = "";
    var scriptFiles = [];
    var SCRIPT_NAME = "Tiny Script Launcher";
    
    var panel = buildUI(thisObj);
    if (panel instanceof Window) {
        panel.center();
        panel.show();
    } else {
        panel.layout.layout(true);
    }
    
    function buildUI(thisObj) {
        var bounds;
        if (app.settings.haveSetting("AE_ScriptLauncher", "panelBounds") && !(thisObj instanceof Panel)) {
            bounds = app.settings.getSetting("AE_ScriptLauncher", "panelBounds").split(",");
            for (var i = 0; i < bounds.length; i++) {
                bounds[i] = parseInt(bounds[i], 10);
            }
        }
        
        var panel = (thisObj instanceof Panel) ? thisObj : new Window("palette", SCRIPT_NAME, bounds, {resizeable: true});
        if (!panel) return null;
        
        panel.orientation = "column";
        panel.alignChildren = ["fill", "fill"];
        
        var contentArea = panel.add("group");
        contentArea.orientation = "column";
        contentArea.alignment = ["fill", "fill"];
        contentArea.alignChildren = ["fill", "fill"];
        contentArea.spacing = 4;
        
        var searchGroup = contentArea.add("group");
        searchGroup.alignment = ["fill", "top"];
        searchGroup.alignChildren = ["fill", "center"];
        searchGroup.spacing = 4;
        
        var searchLabel = searchGroup.add("statictext", undefined, "Search:");
        searchLabel.alignment = ["left", "center"];
        searchLabel.minimumSize.width = 40;
        
        var searchField = searchGroup.add("edittext", undefined, "");
        searchField.alignment = ["fill", "center"];
        
        var scriptList = contentArea.add("listbox", undefined, []);
        scriptList.alignment = ["fill", "fill"];
        scriptList.minimumSize.height = 150;
        
        var refreshBtn = contentArea.add("button", undefined, "Refresh Scripts");
        refreshBtn.alignment = ["fill", "bottom"];
        
        var pathGroup = panel.add("group");
        pathGroup.alignment = ["fill", "bottom"];
        pathGroup.alignChildren = ["left", "center"];
        pathGroup.spacing = 8;
        
        var pathText = pathGroup.add("edittext", undefined, scriptPath ? scriptPath.fsName : "No folder selected");
        pathText.alignment = ["fill", "center"];
        pathText.enabled = false;
        
        var folderBtn = pathGroup.add("button", undefined, "Choose a Folder");
        folderBtn.alignment = ["right", "center"];
        folderBtn.minimumSize.width = 60;
        
        folderBtn.onClick = function() {
            var folder = Folder.selectDialog("Select After Effects Scripts folder");
            if (folder) {
                scriptPath = folder;
                app.settings.saveSetting("AE_ScriptLauncher", "scriptPath", folder.fsName);
                pathText.text = scriptPath.fsName;
                buildScriptsList(scriptList, false);
            }
        };
        
        refreshBtn.onClick = function() {
            buildScriptsList(scriptList, false);
        };
        
        searchField.onChanging = function() {
            filterScriptsList(scriptList, searchField.text);
        };
        
        scriptList.onDoubleClick = function() {
            if (scriptList.selection) {
                var scriptIndex = scriptList.selection.index;
                if (searchField.text) {
                    scriptIndex = scriptList.selection.scriptIndex;
                }
                
                var scriptFile = new File(scriptFiles[scriptIndex].absoluteURI);
                if (scriptFile.exists) {
                    try {
                        $.evalFile(scriptFile);
                    } catch (error) {
                        alert("Error running script: " + error.toString());
                    }
                } else {
                    alert("Cannot locate the selected script.");
                }
            }
        };
        
        panel.onResizing = panel.onResize = function() { 
            this.layout.resize(); 
        };
        panel.minimumSize = [0, 0];
        
        panel.onClose = function() {
            if (!(panel instanceof Panel)) {
                app.settings.saveSetting("AE_ScriptLauncher", "panelBounds", panel.bounds.toString());
            }
        };
        
        if (app.settings.haveSetting("AE_ScriptLauncher", "scriptPath")) {
            scriptPath = new Folder(app.settings.getSetting("AE_ScriptLauncher", "scriptPath"));
            pathText.text = scriptPath.fsName;
            buildScriptsList(scriptList, false);
        }
        
        return panel;
    }
    
    function buildScriptsList(listBox, showPaths) {
        listBox.removeAll();
        listBox.minimumSize.width = 0;
        listBox.minimumSize.height = 0;
        if (!scriptPath) return;
        
        scriptFiles = getScriptFiles(scriptPath);
        
        for (var i = 0; i < scriptFiles.length; i++) {
            var displayName = showPaths ? 
                scriptFiles[i].fsName.substr(scriptPath.fsName.length + 1) : 
                scriptFiles[i].displayName.replace(/\.(js|jsx|jsxbin)$/, "");
            
            var item = listBox.add("item", displayName);
            item.scriptIndex = i;
            
            var iconFile = File(scriptFiles[i].fsName.replace(/\.(js|jsx|jsxbin)$/, ".png"));
            if (iconFile.exists) {
                item.icon = iconFile;
            }
        }
    }
    
    function filterScriptsList(listBox, searchText) {
        if (!searchText) {
            buildScriptsList(listBox, false);
            return;
        }
        
        listBox.removeAll();
        if (!scriptPath || !scriptFiles.length) return;
        
        searchText = searchText.toLowerCase();
        
        for (var i = 0; i < scriptFiles.length; i++) {
            var displayName = scriptFiles[i].displayName.replace(/\.(js|jsx|jsxbin)$/, "");
            
            if (displayName.toLowerCase().indexOf(searchText) !== -1) {
                var item = listBox.add("item", displayName);
                item.scriptIndex = i;
                
                var iconFile = File(scriptFiles[i].fsName.replace(/\.(js|jsx|jsxbin)$/, ".png"));
                if (iconFile.exists) {
                    item.icon = iconFile;
                }
            }
        }
    }
    
    function getScriptFiles(folder) {
        var files = folder.getFiles();
        var results = [];
        
        files.sort(function(a, b) {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        
        for (var i = 0; i < files.length; i++) {
            if (files[i] instanceof Folder) {
                if (!files[i].name.match(/^\(.*\)$/)) {
                    var subFiles = getScriptFiles(files[i]);
                    results = results.concat(subFiles);
                }
            } else if (files[i].name.match(/\.(js|jsx|jsxbin)$/) && 
                       files[i].fsName !== File($.fileName).fsName) {
                results.push(files[i]);
            }
        }
        
        return results;
    }
    
})(this);