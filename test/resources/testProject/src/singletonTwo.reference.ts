/*
 * singletonTwo.
 * @class
 * @classdesc <strong>Note here</strong>
 *
 * @version ${version}
 *
 */
export class singletonTwo {
    static someData = {
        foo: "bar"
    };
    static someFunction(...args: any) { return true; }
    static someOtherFunction(...args: any) {
        // Some final Comment
    }
    static someSelfCallingFunction(...args: any) {
        this.someOtherFunction();
    }
}