import { Generator } from './generator';
import path from 'path';
import _ from 'lodash';
import { writeFileHeader } from '../util/file';
import { getPropertyMock } from '../util/mock';
import { GeneratorTarget, type Schema } from '../core/types';

export class DTOMockerGenerator extends Generator {
    name = 'dto-mocker';
    target = GeneratorTarget.SingleFile;
    targetLocation = path.resolve(process.cwd(), './generated');
    targetName = 'dto-mocker.ts';

    generate = () => {
        const { typeDefinitions, types } = this.getContext()
        if (types === undefined || typeDefinitions === undefined) {
            throw 'Invalid run order, DTOMockGenerator must run after type generator';
        }

        const imports = _.map(
            typeDefinitions,
            'name'
        );

        let generated = `
        ${writeFileHeader('dto-mocker.ts', 'Provides mock functions for each dto created in the application')}

        import { faker } from '@faker-js/faker';
        import {
            ${_.map(_.filter(imports, name => !name.includes('Enum')), name => `${name}Dto`).join(', ')}
        } from './dto';
        import {
            NonEmptyArray,
            ${imports.join(', ')}
        } from './types';
        
        `;

        _.map(typeDefinitions, type => {
            const properties = _.keys(type.definition),
                schema = types[type.name];
            if (!properties.length || schema.properties === undefined) {
                return; // enums are also generated in the type definition and they can't be made classes
            }

            const schemaProperties: Schema = schema.properties;
            generated += `
                export const create${type.name}Factory = (overrides: Partial<${type.name}> = {}): ${type.name}Dto => new ${type.name}Dto({
                    ${_.map(properties, property => getPropertyMock(property, type, schemaProperties[property])).join(',')},
                    ...overrides
                });
            `;
        })

        return generated;
    }
}
