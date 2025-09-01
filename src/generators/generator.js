
export const GeneratorTarget = {
    SingleFile: 'single',
    MultipleFiles: 'multi'
}

// export interface Generator {
//   name: string;
//   target: GeneratorTarget;
//   targetLocation: string;
//   targetName: string;

//   addContext: () => ProcessorContext;
//   setContext: (context: ProcessorContext) => void;
//   getContext: () => ProcessorContext;
//   generateTargetName: (schemaName: string) => string;
//   generate: () => Record<string,string>;
// }

export class Generator {
    name = 'generator';
    target = GeneratorTarget.SingleFile;
    targetLocation = process.cwd() + '/generated';
    targetName = 'generated.ts';

    _schema;
    _context;

    constructor(schema, context) {
        this._schema = schema;
        this._context = context;
    }

    getName = () => this.name;

    getTarget = () => this.target;

    getTargetLocation = () => this.targetLocation;

    getTargetName = () => this.targetName;

    getSchema = () => this._schema;

    setContext = (context) => {
        this._context = context;
    }

    getContext = () => this._context;

    addContext = () => ({})

    generateTargetName = (schemaName) => {
        if (this.target === GeneratorTarget.SingleFile) {
            return this.targetName;
        }

        // replace [name]
        return this.targetName.replace(/(\[name\])/g, schemaName);
    };

    generate = () => {
        throw new Error('implement your generator');
    }
}
