import { GeneratorTarget, Generator } from './generator';
import path from 'path';
import _ from 'lodash';
import { writeFileHeader } from '../util/file';
import { getPropertyMock } from '../util/mock';

export class DTOMockerGenerator extends Generator {
    name = 'dto-mocker';
    target = GeneratorTarget.SingleFile;
    targetLocation = path.resolve(process.cwd(), './generated');
    targetName = 'dto-mocker.ts';

    addContext = () => { }

    generate = () => {
        const { typeDefinitions, types } = this.getContext()

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
            if (!properties.length) {
                return; // enums are also generated in the type definition and they can't be made classes
            }

            generated += `
                export const create${type.name}Factory = (overrides: Partial<${type.name}> = {}): ${type.name}Dto => new ${type.name}Dto({
                    ${_.map(properties, property => getPropertyMock(property, type, schema.properties[property])).join(',')},
                    ...overrides
                });
            `;
        })

        return generated;
    }
}
