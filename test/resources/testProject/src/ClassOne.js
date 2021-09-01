
sap.ui.define([
    "sap/ui/core/Control"

], function(Control) {
    "use strict";

    /**
     * Creates a new ClassOne.
     *
     * @class
     * @classdesc
     *
     * <strong>Note here</strong>
     *
     * @author Samer Aldefai
     * @version ${version}
     * @extends sap.ui.core.Control
     * @public
     */

    var ClassOne = Control.extend("some.name.space.ClassOne", {
        metadata: {
            properties: {
                "arrayOfStrings": {type: "string[]", defaultValue: []}
            }
        },
        renderer: Control.getMetadata().getRenderer()
    });

    ClassOne.prototype.init = function() {
        // Some Comment
        // Some other Comment
        Control.prototype.init.apply(this, arguments);

        // Some final Comment
    };

    ClassOne.prototype.setArrayOfStrings = function(aArrayOfStrings) {
        this.setProperty("arrayOfStrings", aArrayOfStrings);
    };

    return ClassOne;
});