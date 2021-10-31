import Control from "sap/ui/core/Control";
/*
 * singleton.
 * @class
 * @classdesc <strong>Note here</strong>
 *
 * @version ${version}
 *
 */
export class singleton {
    static someData = {
        foo: "bar"
    };
    static someFunction(...args: any) { }
    static someOtherFunction(...args: any) {
        // Some Comment
        // Some other Comment
        Control.escapeSettingsValue("bla");
        // Some final Comment
    }
    static someSelfCallingFunction(...args: any) {
        this.someOtherFunction();
    }
}