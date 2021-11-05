
sap.ui.define([
    "./ClassOne.reference"

], function(ClassOne) {
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
     * @extends some.name.space.ClassOne
     * @public
     */

    return ClassOne.extend("some.name.space.ClassTwo", {
        metadata: {
            properties: {
                "arrayOfStrings": {type: "string[]", defaultValue: []}
            }
        },
        renderer: ClassOne.getMetadata().getRenderer(),

        init: function() {
            // Some Comment
            // Some other Comment
            ClassOne.prototype.init.apply(this, arguments);

            // Some final Comment
        },

        setArrayOfStrings: function(aArrayOfStrings) {
            this.setProperty("arrayOfStrings", aArrayOfStrings);
        }
    });
});