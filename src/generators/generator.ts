import { OpenAPIV3_1 } from 'openapi-types';
import { type IGenerator, type Document, type ProcessorContext, GeneratorTarget } from '../core/types'

export class Generator implements IGenerator {
    name: string = 'generator';
    target: GeneratorTarget = GeneratorTarget.SingleFile;
    targetLocation: string = process.cwd() + '/generated';
    targetName: string = 'generated.ts';

    _schema: Document;
    _context: ProcessorContext;

    constructor(schema: Document, context: ProcessorContext) {
        this._schema = schema;
        this._context = context;
    }

    getName = (): string => this.name;

    getTarget = (): GeneratorTarget => this.target;

    getTargetLocation = (): string => this.targetLocation;

    getTargetName = (): string => this.targetName;

    getSchema = (): Document => this._schema;

    setContext = (context: ProcessorContext): void => {
        this._context = context;
    }

    getContext = (): ProcessorContext => this._context;

    addContext = (): ProcessorContext => ({})

    generateTargetName = (schemaName: string): string => {
        if (this.target === GeneratorTarget.SingleFile) {
            return this.targetName;
        }

        // replace [name]
        return this.targetName.replace(/(\[name\])/g, schemaName);
    };

    generate = (): Record<string, string> | string => {
        throw new Error('implement your generator');
    }
}
