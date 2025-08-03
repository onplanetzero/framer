import { GeneratorTarget } from '../generators/generator';
import { TypeGenerator } from '../generators/type-generator';
import fs from 'fs';
import _ from 'lodash';

const defaultGenerators = [
  TypeGenerator,
];

export class Processor {
  completed = [];
  outputByGenerator = {};
  context = {};

  run = async (schema) => {
    _.map(defaultGenerators, generatorClass => {
      // instantiate with existing context
      const generator = new generatorClass(schema, this.context);

      // update context from the new generator
      this.context = {
        ...this.context,
        ...generator.addContext(),
      }

      // set back in generator for usage
      generator.setContext(this.context);
      
      
      const generated = generator.generate(),
        targetLocation = generator.getTargetLocation();
      if(generator.getTarget() == GeneratorTarget.SingleFile) {
        // output to the target location with target file name
        // single file
        if(!fs.existsSync(targetLocation)) {
          fs.mkdirSync(targetLocation, { recursive: true });
        }

        const targetName = generator.getTargetName(),
          file = `${targetLocation}/${targetName}`;
        console.log(`generating ${generator.getName()} --> ${file}`)
        fs.writeFileSync(`${file}`, generated, 'utf8');
      }
    })
  }
}
