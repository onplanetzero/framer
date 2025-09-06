import fs from "fs";
import yaml from "js-yaml";
import _ from "lodash";

const concatArrays = (objValue: unknown, srcValue: unknown): unknown => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
        return objValue.concat(srcValue);
    }
};

export const combine = (directoryPath: string): string => {
    const files: unknown[] = []; // load returns unknown but we know its a string?
    fs.readdirSync(directoryPath).forEach((file) => {
        const data: string | unknown = yaml.load(
            fs.readFileSync(directoryPath + "/" + file, "utf-8"),
        );
        files.push(data);
    });

    return yaml.dump(
        _.mergeWith({}, ...files, concatArrays)
    );
};
