export class BaseClass {
    constructor(...args: any) {
        this.someMethodOfBaseClass();
    }
    someMethodOfBaseClass(...args: any) {
        return this;
    }
}