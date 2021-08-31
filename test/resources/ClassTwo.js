
sap.ui.define([
    "sap/ui/core/Control"

], function(Control) {
    "use strict";

    /**
     * Creates a new ClassTwo.
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

    return Control.extend("some.name.space.ClassTwo", {
        metadata: {
            properties: {
                "arrayOfStrings": {type: "string[]", defaultValue: []}
            }
        },
        renderer: Control.getMetadata().getRenderer(),

        init: function() {
            // Some Comment
            // Some other Comment
            Control.prototype.init.apply(this, arguments);

            // Some final Comment
        },

        setArrayOfStrings: function(aArrayOfStrings) {
            this.setProperty("arrayOfStrings", aArrayOfStrings);
        }
    });
});