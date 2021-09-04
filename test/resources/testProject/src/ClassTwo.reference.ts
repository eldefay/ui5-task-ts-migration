import Control, { $ControlSettings } from "sap/ui/core/Control";
export class ClassTwo extends Control {
    public static metadata = { properties: {
            "arrayOfStrings": { type: "string[]", defaultValue: [] }
        } };
    constructor(mSettings?: $ControlSettings) {
        super(mSettings);
    }
    setArrayOfStrings(aArrayOfStrings) {
        this.setProperty("arrayOfStrings", aArrayOfStrings);
    }
}