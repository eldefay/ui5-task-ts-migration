
sap.ui.define([
    "sap/ui/core/Control"

], function(Control) {
    "use strict";

    /**
     * singleton.
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

    var singleton = {
        someData: {
            foo: "bar"
        },
        someFunction: () => {}
    };

    singleton.someOtherFunction = function() {
        // Some Comment
        // Some other Comment
        Control.escapeSettingsValue("bla");

        // Some final Comment
    };

    singleton.someSelfCallingFunction = function() {
        this.someOtherFunction();
    };

    return singleton;
});