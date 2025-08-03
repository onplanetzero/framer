import fs from 'fs';
import yaml from 'js-yaml';
import _ from 'lodash';

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

export const combine = (directoryPath, outputPath) => {
    let files = [];
    fs.readdirSync(directoryPath)
        .forEach(file => {
            const data = yaml.load(fs.readFileSync(directoryPath + '/' + file, 'utf-8'));
            files.push(data);
        })
    const merged = _.mergeWith({}, ...files, concatArrays);
    return fs.writeFileSync(outputPath, yaml.dump(merged));
}