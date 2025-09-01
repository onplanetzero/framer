import pkg from '../../package.json';
import { execSync } from 'child_process';

export const getVersion = () => pkg.version;
export const getToolName = () => pkg.name;

export const isFakerInstalled = () => {
    const packageName = '@faker-js/faker';

    try {
        const output = execSync(`npm ls ${packageName} --json`).toString();
        const result = JSON.parse(output);
        if (
            (result.dependencies && result.dependencies[packageName]) ||
            (result.devDependencies && result.devDependencies[packageName])
        ) {
            return true;
        }

        return false;
    } catch (e) {
        return false;
    }
}
