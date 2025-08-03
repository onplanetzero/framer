import { GeneratorTarget, Generator } from './generator';
import path from 'path';
import _ from 'lodash';
import { getTypesFromSchema, decorateWithLookupTypes } from '../util/types';

export class TypeGenerator extends Generator {
  name = 'types';
  target = GeneratorTarget.SingleFile;
  targetLocation = path.resolve(process.cwd(), './generated');
  targetName = 'types.ts';

  addContext = () => {
    const schema = this.getSchema(),
      paths = schema.paths,
      schemas = schema.components?.schemas ?? {};

    let types = {},
      stringifiedTypes = {},
      operations = {},
      responses = {},
      decoratedResponseTypes = {};

    const topLevelSchemaKeys = _.keys(schemas);
    _.map(topLevelSchemaKeys, schemaName => {
      types[schemaName] = schemas[schemaName]
      stringifiedTypes[schemaName] = JSON.stringify(schemas[schemaName]);
    });

    _.map(topLevelSchemaKeys, schemaName => {
      types[schemaName] = decorateWithLookupTypes(types[schemaName], stringifiedTypes);
    });

    let stringifiedTypeSchemas = _.values(stringifiedTypes),
      stringifiedTypeSchemaNames = _.keys(stringifiedTypes);
    _.forOwn(paths, (route, path) => {
      _.forOwn(route, (operation, method) => {
        _.forOwn(operation.responses, (response) => {
          if(!response.content || !response.content['application/json'] || !response.content['application/json'].schema) {
            return;
          }

          let foundSchema = _.findIndex(stringifiedTypeSchemas, str => str == JSON.stringify(response.content['application/json'].schema));
          if(foundSchema > -1) {
            const foundSchemaDef = response.content['application/json'].schema;
            responses[stringifiedTypeSchemaNames[foundSchema]] = foundSchemaDef;
            decoratedResponseTypes[stringifiedTypeSchemaNames[foundSchema]] = decorateWithLookupTypes(foundSchemaDef, stringifiedTypes);
          }
        });
      });
    });

    return {
      operations,
      responses,
      types,
      stringifiedTypes,
      decoratedResponseTypes,
    };
  }

  generate = () => {
    const { decoratedResponseTypes } = this.getContext()

    let generated = `
    /**
     * Api Response Types
     * Generated with impose@0.0.1
     */

    type NonEmptyArray<T> = [T, ...T[]];

    `;

    _.forOwn(decoratedResponseTypes, (model, name) => {
      const generatedTypes = getTypesFromSchema(name, model);

      _.map(generatedTypes, t => {
        if(t.type == 'enum') {
          return generated += `
            /**
             * Enum: ${t.name}
             **/
            export enum ${t.name} {
              ${_.map(t.enum, value => `${_.capitalize(_.camelCase(value))} = "${value}"`)}
            }
          `;
        }

        generated += `
          /**
           * Type: ${t.name}
           **/
          export interface ${t.name} {
            ${_.map(_.keys(t.definition), property => {
              let propertyDefinition = t.definition[property],
                isRequired = _.findIndex(t.required, str => str === property) > -1,
                propertyName = property
              if(propertyDefinition.includes('[]')) {
                propertyDefinition = propertyDefinition.replace('[]', '');
                propertyDefinition = isRequired ? `NonEmptyArray<${propertyDefinition}>` : `Array<${propertyDefinition}>`;
              } else if(!isRequired) {
                propertyName += '?';
              }

              return `${propertyName}: ${propertyDefinition}`;
            }).join(';\n')}
          }
        `;
      });
    });

    return generated;
  }
}
