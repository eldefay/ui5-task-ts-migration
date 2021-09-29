import Control from "sap/ui/core/Control";
export class singletonTwo {
    static someData = {
        foo: "bar"
    };
    static someFunction(...args: any) { return true; }
    static someOtherFunction(...args: any) {
        Control.escapeSettingsValue("bla");
    }
    static someSelfCallingFunction(...args: any) {
        this.someOtherFunction();
    }
}