/*
 * Creates a new BaseClass.
 * @class
 * @classdesc <strong>Note here</strong>
 *
 * @version ${version}
 *
 */
export default class BaseClass {
    someMethodOfBaseClass(...args: any) {
        return this;
    }
    constructor(...args: any) {
        // Some Comment
        // Some other Comment
        this.someMethodOfBaseClass();
        // Some final Comment
    }
}