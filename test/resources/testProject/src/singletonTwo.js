
sap.ui.define(function() {
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

        // Some final Comment
    };

    singletonTwo.someSelfCallingFunction = function() {
        this.someOtherFunction();
    };

    return singletonTwo;
});