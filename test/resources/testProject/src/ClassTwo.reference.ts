import ClassOne from "./ClassOne.reference";
import { $ControlSettings } from "sap/ui/core/Control";
/*
 * Creates a new ClassTwo.
 * @class
 * @classdesc <strong>Note here</strong>
 *
 * @version ${version}
 * @extends {some.name.space.ClassOne}
 *
 */
export default class ClassTwo extends ClassOne {
    public static metadata = { properties: {
            "arrayOfStrings": { type: "string[]", defaultValue: [] }
        } };
    constructor(mSettings?: $ControlSettings) {
        super(mSettings);
    }
    setArrayOfStrings(aArrayOfStrings: any) {
        this.setProperty("arrayOfStrings", aArrayOfStrings);
    }
}