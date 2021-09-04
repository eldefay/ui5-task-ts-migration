
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

    /**
     * @method
     * @override
     * @description
     * 
     * some method calling super (applying arguments form base class)
     */
     ClassOne.prototype.setBusy = function() {
        Control.prototype.setBusy.apply(this, arguments);
        return this;
    };

    /**
     * @method
     * @override
     * @description
     * 
     * some method calling deep super (applying arguments from deep base class)
     */
    ClassOne.prototype.addAggregation = function() {
        Control.prototype.addAggregation.apply(this, arguments);
        return this;
    };

    return ClassOne;
});