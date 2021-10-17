export class singletonTwo {
    static someData = {
        foo: "bar"
    };
    static someFunction(...args: any) { return true; }
    static someOtherFunction(...args: any) {
    }
    static someSelfCallingFunction(...args: any) {
        this.someOtherFunction();
    }
}