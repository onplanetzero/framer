import path from "node:path";
import { makeCli, run } from "../core/program";

export const generate = async (schemaFile: string) => {
    const framer = makeCli({ exitOverride: true, suppressOutput: true });
    await run(framer, [
        "node",
        "framer",
        "generate",
        "-a",
        schemaFile,
        "-o",
        path.resolve(__dirname, "../../tests/generated"),
    ]);
};
