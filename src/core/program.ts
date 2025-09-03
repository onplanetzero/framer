import commander, { type Command } from "commander";
import { Processor } from "./processor";
import {
    type ProcessorInterface,
    type Document,
    type GeneratedContent,
} from "./types";

export const makeCli = (options?: {
    exitOverride?: boolean;
    suppressOutput?: boolean;
}): Command => {
    const program = new commander.Command()
        .version("0.0.1")
        .description(
            "A javascript code generator following openapi spec 3.x that generates schemas to enforce a contract between client and api",
        );

    program
        .command("generate")
        .version("0.0.1")
        .option(
            "-a, --api <file>",
            "The yaml file(s) being used for generation",
        )
        .option(
            "-d, --directory <directory>",
            "The folder of yaml file(s) to be combined for generation",
        )
        .option(
            "-o, --output <outputDirectory>",
            "The output combined yaml file if using the directory option",
        )
        .action(async (options) => {
            const processor: ProcessorInterface = new Processor(options);

            const api: Awaited<Promise<Document>> = await processor.parse();
            const generated: GeneratedContent = processor.generate(api);
            processor.write(generated);
            processor.format();
        });

    // Configuration
    if (options?.exitOverride) {
        program.exitOverride();
    }

    if (options?.suppressOutput) {
        program.configureOutput({
            writeOut: () => { },
            writeErr: () => { },
        });
    }

    return program;
};

export const run = async (program: Command, argv: string[]): Promise<Command> =>
    await program.parseAsync(argv);

