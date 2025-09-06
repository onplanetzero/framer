import type { OpenAPIV3_1 } from "openapi-types";

export type HttpMethods = OpenAPIV3_1.HttpMethods;
export type Document = OpenAPIV3_1.Document;
export type PathsObject = OpenAPIV3_1.PathsObject;
export type PathItemObject = OpenAPIV3_1.PathItemObject;
export type OperationObject = OpenAPIV3_1.OperationObject;
export type ResponsesObject = OpenAPIV3_1.ResponsesObject;
export type ResponseObject =
    | OpenAPIV3_1.ResponseObject
    | (OpenAPIV3_1.ReferenceObject & {
        content?: OpenAPIV3_1.MediaTypeObject; // bugfix for content doesn't exist on ResponseObject bug
    });
export type RequestBodyObject =
    | OpenAPIV3_1.RequestBodyObject
    | (OpenAPIV3_1.RequestBodyObject & {
        content?: OpenAPIV3_1.MediaTypeObject; // bugfix for content doesn't exist on ResponseObject bug
    });

export type GeneratedContent = Record<string, string | Record<string, string>>;
export interface GeneratorInterface {
    name: string;
    target: GeneratorTarget;
    targetName: string;

    addContext: () => ProcessorContext | null;
    setContext: (context: ProcessorContext) => void;
    getContext: () => ProcessorContext;
    generateTargetName: (schemaName: string) => string;
    generate: () => Record<string, string> | string;
}

export interface ProcessorInterface {
    completed: string[];
    context: ProcessorContext;
    schema: Document;
    options: ProcessorOptions;
    generated: GeneratedContent;

    parse: () => Promise<Document>;
    generate: (schema: Document) => GeneratedContent;
    write: (content: GeneratedContent) => void;
    format: () => void;
}

export interface ProcessorOptions {
    output: string;
    directory?: string;
    api?: string;
}

export type Schema = OpenAPIV3_1.SchemaObject & {
    __ref?: string;
};

export type ArraySchema = OpenAPIV3_1.ArraySchemaObject & {
    items: Schema;
    __ref?: string;
};

export type SchemaMap = Record<string, Schema>;

export interface ProcessorContext {
    types?: SchemaMap;
    stringifiedTypes?: LookupTypes;
    operations?: Record<string, OperationObject>;
    responses?: SchemaMap;
    decoratedResponseTypes?: SchemaMap;
    typeDefinitions?: Record<string, TypeDef>;
    requestBodies?: Record<string, Schema>;
    decoratedRequestBodies?: Record<string, Schema>;
}

export enum GeneratorTarget {
    SingleFile = "single",
    MultipleFiles = "multi",
}

export type LookupTypes = Record<string, string>;

export interface TypeDef {
    name: string;
    type?: string; // used for enums
    enumType?: string;
    enum?: Array<string>;
    definition: Record<string, string> | string;
    required?: string[];
}

export enum SupportedDataFormat {
    json = "application/json",
    xml = "application/xml",
    formUrlEncoded = "application/x-www-form-url-encoded",
}
