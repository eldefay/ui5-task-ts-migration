import Control from "sap/ui/core/Control"; 


export class ClassOne extends Control {
    public static metadata = { properties: {
            "arrayOfStrings": { type: "string[]", defaultValue: [] }
        } };
    constructor() {
        super();
    }
    setArrayOfStrings(aArrayOfStrings) {
        this.setProperty("arrayOfStrings", aArrayOfStrings);
    }
}
"use strict";