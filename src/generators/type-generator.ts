import { Generator } from './generator';
import path from 'path';
import _ from 'lodash';
import { getTypesFromSchema, decorateWithLookupTypes, getStaticTypes, generatePropertyDefinition, getEnumValues } from '../util/types';
import { writeFileHeader } from '../util/file';
import {
    GeneratorTarget,
    type ProcessorContext,
    type PathsObject,
    type PathItemObject,
    type SchemaMap,
    type Document,
    type LookupTypes,
    type OperationObject,
    type Schema,
    type ResponsesObject,
    type ResponseObject,
    type TypeDef,
    SupportedDataFormat
} from '../core/types'

export class TypeGenerator extends Generator {
    name = 'types';
    target = GeneratorTarget.SingleFile;
    targetLocation = path.resolve(process.cwd(), './generated');
    targetName = 'types.ts';

    addContext = (): ProcessorContext => {
        const schema: Document = this.getSchema();

        const paths: PathsObject = schema.paths,
            schemas = schema.components.schemas;

        const types: SchemaMap = {},
            stringifiedTypes: LookupTypes = {},
            operations: Record<string, OperationObject> = {},
            responses: Record<string, Schema> = {},
            decoratedResponseTypes: Record<string, Schema> = {};

        const topLevelSchemaKeys: string[] = _.keys(schemas);
        _.map(topLevelSchemaKeys, schemaName => {
            types[schemaName] = schemas[schemaName]
            stringifiedTypes[schemaName] = JSON.stringify(schemas[schemaName]);
        });

        _.map(topLevelSchemaKeys, schemaName => {
            types[schemaName] = decorateWithLookupTypes(types[schemaName], stringifiedTypes);
        });

        const stringifiedTypeSchemas: string[] = _.values(stringifiedTypes),
            stringifiedTypeSchemaNames: string[] = _.keys(stringifiedTypes);


        for (const url in paths) {
            const path: PathItemObject = paths[url];

            for (const method in path) {
                const operation: OperationObject = path[method],
                    operationResponses: ResponsesObject = operation.responses;

                for (const statusCode in operationResponses) {
                    const response: ResponseObject = operationResponses[statusCode];
                    if (response.content === undefined) {
                        continue;
                    }

                    const content = response.content;
                    if (!content[SupportedDataFormat.json]) {
                        continue;
                    }

                    const mediaObject = content[SupportedDataFormat.json];
                    if (!mediaObject.schema) {
                        continue;
                    }

                    const schemaIndex: number = _.findIndex(stringifiedTypeSchemas, str => str === JSON.stringify(mediaObject.schema));
                    if (schemaIndex > -1) {
                        const foundSchemaDef: Schema = response.content[SupportedDataFormat.json].schema;
                        responses[stringifiedTypeSchemaNames[schemaIndex]] = foundSchemaDef;
                        decoratedResponseTypes[stringifiedTypeSchemaNames[schemaIndex]] = decorateWithLookupTypes(foundSchemaDef, stringifiedTypes);
                    }
                }
            }
        }

        const typeDefinitions: Record<string, TypeDef> = {};
        _.forOwn(decoratedResponseTypes, (model, name) => {
            const generatedResponseTypes: TypeDef[] = getTypesFromSchema(name, model);

            _.map(generatedResponseTypes, (type: TypeDef): void => {
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
        } satisfies ProcessorContext;
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
                        ${_.map(getEnumValues(t.enum), value => `${_.capitalize(_.camelCase(value))} = "${value}"`)}
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
