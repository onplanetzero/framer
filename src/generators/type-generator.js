import { GeneratorTarget, Generator } from './generator';
import path from 'path';
import _ from 'lodash';
import { getTypesFromSchema, decorateWithLookupTypes, getStaticTypes, generatePropertyDefinition } from '../util/types';
import { writeFileHeader } from '../util/file';

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
                    if (!response.content || !response.content['application/json'] || !response.content['application/json'].schema) {
                        return;
                    }

                    let foundSchema = _.findIndex(stringifiedTypeSchemas, str => str == JSON.stringify(response.content['application/json'].schema));
                    if (foundSchema > -1) {
                        const foundSchemaDef = response.content['application/json'].schema;
                        responses[stringifiedTypeSchemaNames[foundSchema]] = foundSchemaDef;
                        decoratedResponseTypes[stringifiedTypeSchemaNames[foundSchema]] = decorateWithLookupTypes(foundSchemaDef, stringifiedTypes);
                    }
                });
            });
        });

        let typeDefinitions = {};
        _.forOwn(decoratedResponseTypes, (model, name) => {
            const generatedResponseTypes = getTypesFromSchema(name, model);

            _.map(generatedResponseTypes, type => {
                typeDefinitions[type.name] = type;
            })
        })

        return {
            operations,
            responses,
            types,
            stringifiedTypes,
            decoratedResponseTypes,
            typeDefinitions,
        };
    }

    generate = () => {
        const { typeDefinitions } = this.getContext()

        let generated = `
        ${writeFileHeader('types.ts', 'Types and Enums are generated into this file for usage in both the front and backend of your typescript application, representing data coming from and going to the api.')}

        ${getStaticTypes()}
        
        `;

        _.map(typeDefinitions, t => {
            if (t.type == 'enum') {
                return generated += `
                    /**
                     * Enum: ${t.name}
                     */
                    export enum ${t.name} {
                        ${_.map(t.enum, value => `${_.capitalize(_.camelCase(value))} = "${value}"`)}
                    }
                `;
            }

            generated += `
                /**
                 * Type: ${t.name}
                 */
                export interface ${t.name} {
                    ${_.map(_.keys(t.definition), property => `${generatePropertyDefinition(t, property)}`).join(';\n')}
                }
            `;
        });

        return generated;
    }
}
