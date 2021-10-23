
sap.ui.define(function() {
    "use strict";

    /**
     * Creates a new BaseClass.
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

    var BaseClass = function() {
        // Some Comment
        // Some other Comment
        this.someMethodOfBaseClass();
        // Some final Comment
    };

    BaseClass.prototype.someMethodOfBaseClass = function() {
        return this;
    };

    return BaseClass;
});