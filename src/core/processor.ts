import fs from 'fs';
import _ from 'lodash';
import { TypeGenerator } from '../generators/type-generator';
import { DTOGenerator } from '../generators/dto-generator';
import { DTOMockerGenerator } from '../generators/dto-mocker-generator';
import { type IProcessor, type Document, type ProcessorContext, GeneratorTarget } from './types';
import { exec } from 'node:child_process';

const defaultGenerators = [
    TypeGenerator, // always has to be first
    DTOGenerator,
    DTOMockerGenerator,
];

export class Processor implements IProcessor {
    completed: string[] = [];
    context: ProcessorContext = {};

    run = async (schema: Document) => { // not making an openapi type
        _.map(defaultGenerators, generatorClass => {
            // instantiate with existing context
            const generator = new generatorClass(schema, this.context);

            // update context from the new generator
            this.context = {
                ...this.context,
                ...generator.addContext() ?? {},
            }

            // set back in generator for usage
            generator.setContext(this.context);


            const generated = generator.generate(),
                targetLocation = generator.getTargetLocation();
            if (generator.getTarget() == GeneratorTarget.SingleFile) {
                // output to the target location with target file name
                // single file
                if (!fs.existsSync(targetLocation)) {
                    fs.mkdirSync(targetLocation, { recursive: true });
                }

                const targetName: string = generator.getTargetName(),
                    file: string = `${targetLocation}/${targetName}`;
                console.log(`generating ${generator.getName()} --> ${file}`)
                fs.writeFileSync(`${file}`, generated, 'utf8');
            }
        })

        console.log("Running Prettier...");
        const dir = process.cwd() + '/generated';
        exec('npx prettier --write ' + dir)
        console.log("Generation Complete!");
    }
}
