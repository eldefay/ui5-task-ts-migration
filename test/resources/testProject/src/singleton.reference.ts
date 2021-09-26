import Control from "sap/ui/core/Control";
export class singleton {
    static someData = {
        foo: "bar"
    };
    static someFunction(...args: any) { }
    static someOtherFunction(...args: any) {
        Control.escapeSettingsValue("bla");
    }
    static someSelfCallingFunction(...args: any) {
        this.someOtherFunction();
    }
}