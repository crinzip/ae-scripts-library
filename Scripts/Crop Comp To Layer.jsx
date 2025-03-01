/**
 * Crop Comp to Layer(s)
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
 */

(function createUI(thisObj) {
    var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Crop Comp to Layer(s)", undefined, {resizeable: true});
    
    // Create main container
    var mainGroup = myPanel.add("group");
    mainGroup.orientation = "column";
    mainGroup.alignChildren = ["fill", "top"];
    mainGroup.spacing = 10;
    mainGroup.margins = 10;
    mainGroup.alignment = ["fill", "fill"];
    
    // Add a button to the panel that fills available width
    var cropButton = mainGroup.add("button", undefined, "Crop to Selected Layer(s)", {name: "cropButton"});
    cropButton.preferredSize.height = 30;
    cropButton.alignment = ["fill", "top"];
    
    // Add a divider line
    var divider = mainGroup.add("panel", undefined, undefined);
    divider.alignment = ["fill", "top"];
    divider.height = 2;
    
    // Add comp name display
    var compGroup = mainGroup.add("group");
    compGroup.orientation = "row";
    compGroup.alignChildren = ["left", "center"];
    
    compGroup.add("statictext", undefined, "Active Comp:");
    var compNameText = compGroup.add("statictext", undefined, "---");
    compNameText.characters = 25;

    // Add resolution display area
    var resolutionGroup = mainGroup.add("group");
    resolutionGroup.orientation = "row";
    resolutionGroup.alignChildren = ["left", "center"];
    
    resolutionGroup.add("statictext", undefined, "Resolution:");
    var resolutionText = resolutionGroup.add("statictext", undefined, "---");
    resolutionText.characters = 15;
    
    // Add status text area
    var statusGroup = mainGroup.add("group");
    statusGroup.orientation = "row";
    statusGroup.alignChildren = ["left", "center"];
    
    statusGroup.add("statictext", undefined, "Status:");
    var statusText = statusGroup.add("statictext", undefined, "Ready");
    statusText.characters = 25;
    
    // Update the resolution and comp name text when a comp is selected
    function updatePanelInfo() {
        if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
            var comp = app.project.activeItem;
            resolutionText.text = comp.width + " x " + comp.height;
            compNameText.text = comp.name;
        } else {
            resolutionText.text = "---";
            compNameText.text = "---";
        }
    }
    
    // Set the button's onClick action
    cropButton.onClick = function() {
        cropCompToSelectedLayers();
        updatePanelInfo();
    };
    
    // Make the panel resizable
    myPanel.layout.layout(true);
    myPanel.layout.resize();
    myPanel.onResizing = myPanel.onResize = function() {
        this.layout.resize();
    };
    
    // Set minimum size for the panel
    myPanel.minimumSize = [250, 150];
    
    // Show the panel
    if (!(thisObj instanceof Panel)) {
        myPanel.center();
        myPanel.show();
    }
    
    // Update panel info when the panel is shown
    updatePanelInfo();
    
    // Listen for composition activation
    if (!(thisObj instanceof Panel)) {
        myPanel.onActivate = function() {
            updatePanelInfo();
        };
    }
    
    // Add a timer to periodically update the panel info
    myPanel.onShow = function() {
        // Setup a timer to update the panel info every second
        this.updateTimer = app.scheduleTask("updatePanelInfo()", 1000, true);
    };
    
    myPanel.onClose = function() {
        // Clean up the timer when the panel is closed
        if (this.updateTimer) {
            this.updateTimer.cancel();
        }
    };
    
    // Make updatePanelInfo available to the timer
    this.updatePanelInfo = updatePanelInfo;
    
    function cropCompToSelectedLayers() {
        app.beginUndoGroup("Crop Composition to Layer(s)");
        
        try {
            // Check if a composition is active
            if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
                statusText.text = "Please select a composition.";
                updatePanelInfo();
                return;
            }
            
            var comp = app.project.activeItem;
            
            // Check if at least one layer is selected
            if (comp.selectedLayers.length === 0) {
                statusText.text = "Please select at least one layer.";
                updatePanelInfo();
                return;
            }
            
            // Variables to track the combined bounding box
            var left = Number.POSITIVE_INFINITY;
            var top = Number.POSITIVE_INFINITY;
            var right = Number.NEGATIVE_INFINITY;
            var bottom = Number.NEGATIVE_INFINITY;
            
            // Calculate the bounding box that encompasses all selected layers
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                var layerRect = layer.sourceRectAtTime(comp.time, false);
                
                // Get layer position and anchor point
                var layerPosition = layer.position.value;
                var layerAnchor = layer.anchorPoint.value;
                
                // Calculate the corners of this layer
                var layerLeft = layerPosition[0] - layerAnchor[0] + layerRect.left;
                var layerTop = layerPosition[1] - layerAnchor[1] + layerRect.top;
                var layerRight = layerLeft + layerRect.width;
                var layerBottom = layerTop + layerRect.height;
                
                // Update the combined bounding box
                left = Math.min(left, layerLeft);
                top = Math.min(top, layerTop);
                right = Math.max(right, layerRight);
                bottom = Math.max(bottom, layerBottom);
            }
            
            // Calculate the width and height of the combined bounding box
            var newWidth = right - left;
            var newHeight = bottom - top;
            
            // Move all layers to adjust for the new composition origin
            for (var j = 1; j <= comp.numLayers; j++) {
                var currentLayer = comp.layer(j);
                var layerPos = currentLayer.position.value;
                
                // Set keyframes if position is animated
                if (currentLayer.position.numKeys > 0) {
                    for (var k = 1; k <= currentLayer.position.numKeys; k++) {
                        var keyTime = currentLayer.position.keyTime(k);
                        var keyValue = currentLayer.position.keyValue(k);
                        currentLayer.position.setValueAtTime(
                            keyTime,
                            [keyValue[0] - left, keyValue[1] - top, keyValue[2] || 0]
                        );
                    }
                } else {
                    // Just set the position directly if not animated
                    currentLayer.position.setValue([layerPos[0] - left, layerPos[1] - top, layerPos[2] || 0]);
                }
            }
            
            // Set the new composition size
            comp.width = Math.round(newWidth);
            comp.height = Math.round(newHeight);
            
            var message = comp.selectedLayers.length === 1 
                ? "Cropped to 1 layer" 
                : "Cropped to " + comp.selectedLayers.length + " layers";
                
            statusText.text = message;
            resolutionText.text = comp.width + " x " + comp.height;
            compNameText.text = comp.name;
            
        } catch (err) {
            statusText.text = "Error: " + err.toString();
        }
        
        app.endUndoGroup();
    }
})(this);