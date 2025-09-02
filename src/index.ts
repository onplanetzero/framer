#!/usr/bin/env node
import { program } from 'commander';
import figlet from 'figlet';
import { parse } from './util/parser';
import { combine } from './util/combiner';
import { Processor } from './core/processor';
import fs from 'node:fs';
import { type Document } from './core/types';

console.log(figlet.textSync('Framer'));

program.version('0.0.1')
    .description('A javascript code generator following openapi spec 3.x that generates schemas to enforce a contract between client and api');

program
    .command('generate')
    .version("0.0.1")
    .option("-a, --api <file>", "The yaml file(s) being used for generation")
    .option("-d, --directory <directory>", "The folder of yaml file(s) to be combined for generation")
    .option("-o, --output <outputDirectory>", "The output combined yaml file if using the directory option")
    .action(async (options) => {
        const { api, directory, output } = options;
        let apiFile;
        if (directory && output) {
            if (!fs.existsSync(directory)) {
                throw new Error('Directory specified for api does not exist');
            }
            combine(directory, output)
            apiFile = output
        } else if (api) {
            if (!fs.existsSync(api)) {
                throw new Error('File specified for api does not exist');
            }
            apiFile = api
        } else {
            throw new Error('Either a schema file or a directory must be provided for generation');
        }

        const schema: Document = await parse(apiFile),
            processor = new Processor();

        processor.run(schema);
    });

program.parse(process.argv);
