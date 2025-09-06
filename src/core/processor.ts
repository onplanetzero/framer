import _ from "lodash";
import { Generator } from "../generators/generator";
import { TypeGenerator } from "../generators/type-generator";
import { DTOGenerator } from "../generators/dto-generator";
import { DTOMockerGenerator } from "../generators/dto-mocker-generator";
import {
    type ProcessorInterface,
    type Document,
    type ProcessorContext,
    GeneratorTarget,
    type GeneratedContent,
    type ProcessorOptions,
} from "./types";
import { combine } from "../util/combiner";
import SwaggerParser from "@apidevtools/swagger-parser";
import { execSync } from "node:child_process";
import path from 'node:path';
import fs from 'node:fs';

const generators: Record<string, typeof Generator> = {
    types: TypeGenerator, // always has to be first
    dtos: DTOGenerator,
    "dto-mockers": DTOMockerGenerator,
};

export class Processor implements ProcessorInterface {
    completed: string[] = [];
    context: ProcessorContext = {};
    schema: Document;
    options: ProcessorOptions;
    generated: GeneratedContent;

    constructor(options: ProcessorOptions) {
        this.options = options;
    }

    parse = async (): Promise<Document> => {
        const { api, directory, output } = this.options;

        let apiFile: string;
        if (directory && output) {
            if (!fs.existsSync(directory)) {
                throw new Error("Directory specified for api does not exist");
            }
            const combinedApiFile = path.resolve(process.cwd(), 'api.yaml');
            const combinedApiYaml = combine(directory);
            fs.writeFileSync(
                path.resolve(process.cwd(), combinedApiFile),
                combinedApiYaml
            );

            apiFile = combinedApiFile;
        } else if (api) {
            if (!fs.existsSync(api)) {
                throw new Error("File specified for api does not exist");
            }
            apiFile = api;
        } else {
            throw new Error(
                "Either a schema file or a directory must be provided for generation",
            );
        }

        let schema: Awaited<Promise<Document>>;
        try {
            schema = <Document>await SwaggerParser.validate(apiFile); // swagger type didn't play nice, and we know it matches, so cast it
        } catch (e) {
            this.processSwaggerError(e);
        }

        this.schema = schema;

        return schema;
    };

    // eslint-disable-next-line
    processSwaggerError = (e: any) => {
        console.error(e);
    };

    generate = (schema: Document): GeneratedContent => {
        const generatedContent: GeneratedContent = {};
        // not making an openapi type
        _.forOwn(generators, (generatorClass, fileType) => {
            // instantiate with existing context
            const generator = new generatorClass(schema, this.context);

            // update context from the new generator
            this.context = {
                ...this.context,
                ...(generator.addContext() ?? {}),
            };

            // set back in generator for usage
            generator.setContext(this.context);

            const generated = generator.generate();
            if (generator.getTarget() === GeneratorTarget.SingleFile) {
                generatedContent[fileType] = <string>generated;
            } else {
                generatedContent[fileType] = <Record<string, string>>generated;
            }
        });

        this.generated = generatedContent;

        return generatedContent;
    };

    write = (content: GeneratedContent): void => {
        for (const generatorKey in content) {
            const generator = new generators[generatorKey](
                this.schema,
                this.context,
            );

            const generatedContent = content[generatorKey],
                targetLocation = this.options.output;

            if (!fs.existsSync(targetLocation)) {
                fs.mkdirSync(targetLocation, { recursive: true });
            }

            if (generator.getTarget() == GeneratorTarget.SingleFile) {
                const targetName: string = generator.getTargetName(),
                    file: string = `${targetLocation}/${targetName}`;
                console.log(
                    `Writing ${generator.getName()} file [${targetName}]`,
                );
                fs.writeFileSync(file, <string>generatedContent, "utf8");
            } else {
                // multiple file
                console.log(`Writing ${generator.getName()} files [multiple]`);
                for (const fileName in <Record<string, string>>(
                    generatedContent
                )) {
                    const fileContents: string = generatedContent[fileName],
                        outFileName = `${targetLocation}/${generator.generateTargetName(fileName)}`;
                    fs.writeFileSync(outFileName, fileContents, "utf8");
                }
            }
        }
    };

    format = () => {
        console.log("Running Prettier...");
        execSync(`npx prettier --write ${this.options.output}`);
        console.log("Generation Complete!");
    };
}
