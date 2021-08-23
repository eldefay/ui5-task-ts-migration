export interface IConfiguration {
    appHostId?: string;
    appId?: string;
    appName?: string;
    appVersion?: string;
    spaceGuid?: string;
    orgGuid?: string;
    sapCloudService?: string;
    ignoreCache?: boolean;
}

export interface IProjectOptions {
    configuration: IConfiguration;
    projectNamespace: string;
}

export interface ICreateServiceInstanceParams {
    spaceGuid: string;
    planName: string;
    serviceName: string;
    serviceInstanceName?: string;
    tags: string[];
    parameters?: any;
}

export interface IGetServiceInstanceParams {
    [key: string]: string[] | undefined;
    spaceGuids?: string[];
    planNames?: string[];
    names: string[];
}

export interface IServiceInstance {
    name: string;
    guid: string;
}

export interface IResource {
    name: string;
    guid: string;
    tags: string[];
    visibility_type: string;
}




/**
 * Configuration structure for deployment task
 */
 export interface DeploymentConfig {
    app: any;
    target: any;
    credentials?: any;
    exclude?: string[];
    index?: boolean;
    test?: boolean;
    failFast?: boolean;
    yes?: boolean;
    ignoreCertError?: boolean;
}
export interface ResourceSettings {
    path: string,
    statInfo?: any,
    buffer: any,
    string: string,
    createStream: any,
    stream: any,
    project: any
}

export interface Resource {
    getPath(): string;
    getBuffer(): Buffer;
}

export interface MiddlewareParameters<T> {
    resources: object;
    options: {
        configuration: T;
    };
}

export interface Workspace {
    byGlob: (glob: string | string[]) => Promise<Resource[]>;
    write: (resource: ResourceSettings
        , options?: {readOnly?: boolean, drain?: boolean}
        ) => Promise<Resource[]>;
}

export interface TaskParameters<T> {
    workspace: Workspace;
    options: {
        projectName: string;
        projectNamespace: string;
        configuration: T;
    };
}

export interface DeployParameters {
    component: string;
    ui5Theme: string | RegExpMatchArray;
}








export interface ITaskParameters {
    workspace: Workspace;
    options: IProjectOptions;
    taskUtil: any;
}

export interface IBaseAppInfo {
    filepath: string;
    content: any;
}

export interface IHTML5RepoInfo {
    token: string;
    baseUri: string;
}

export type KeyedMap<T, K extends keyof T, V> = { [k in K]: V };