
sap.ui.define([
    "sap/ui/core/Control"

], function(Control) {
    "use strict";

    /**
     * singletonTwo.
     *
     * @class
     * @classdesc
     *
     * <strong>Note here</strong>
     *
     * @author Samer Aldefai
     * @version ${version}
     * @public
     */

    var singletonTwo = new Object();
    singletonTwo.someData = {
            foo: "bar"
        };
    singletonTwo.someFunction = () => true;

    singletonTwo.someOtherFunction = function() {
        // Some Comment
        // Some other Comment
        Control.escapeSettingsValue("bla");

        // Some final Comment
    };

    singletonTwo.someSelfCallingFunction = function() {
        this.someOtherFunction();
    };

    return singletonTwo;
});