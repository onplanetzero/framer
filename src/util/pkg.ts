import pkg from "../../package.json";
import { execSync } from "child_process";

export const getVersion = (): string => pkg.version;
export const getToolName = (): string => pkg.name;

export const isFakerInstalled = (): boolean => {
    const packageName: string = "@faker-js/faker";

    try {
        const output = execSync(`npm ls ${packageName} --json`).toString();
        const result: Record<string, Record<string, string>> = JSON.parse(
            output,
        );
        if (
            (result.dependencies && result.dependencies[packageName]) ||
            (result.devDependencies && result.devDependencies[packageName])
        ) {
            return true;
        }

        return false;
        // eslint-disable-next-line
    } catch (e) {
        console.warn(
            "Faker is recommended for usage with this library, if you wish to use the mocks, install @faker-js/faker",
        );
        return false;
    }
};
