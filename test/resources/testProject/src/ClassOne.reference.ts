import Control, { $ControlSettings } from "sap/ui/core/Control";
import ManagedObject from "sap/ui/base/ManagedObject";
/*
 * Creates a new ClassOne.
 * @class
 * @classdesc <strong>Note here</strong>
 *
 * @version ${version}
 * @extends {sap.ui.core.Control}
 *
 */
export class ClassOne extends Control {
    public static metadata = { properties: {
            "arrayOfStrings": { type: "string[]", defaultValue: [] }
        } };
    constructor(mSettings?: $ControlSettings) {
        super(mSettings);
    }
    setArrayOfStrings(aArrayOfStrings: any) {
        this.setProperty("arrayOfStrings", aArrayOfStrings);
    }
    setBusy(bBusy: boolean) {
        super.setBusy(bBusy);
        return this;
    }
    addAggregation(sAggregationName: string, oObject: ManagedObject, bSuppressInvalidate?: boolean) {
        super.addAggregation(sAggregationName, oObject, bSuppressInvalidate);
        return this;
    }
}