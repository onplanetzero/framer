import { getTypeFromSchema } from "./types";

/**
 * convenience method for attempting to generate id like things when mocking instead of annoyingly bad data
 * without adding nonsense x- fields to the yaml
 * 
 * @param {string} property 
 * @returns {bool}
 */
export const maybeIdField = (property, schema) => {
    // this should be pretty much the case
    if (['integer', 'string'].indexOf(schema.type) === -1) {
        return false;
    }

    // id
    if (['id', 'uuid', 'guid'].indexOf(property) > -1) {
        return true;
    }

    // id_user user_id
    if (property.startsWith('id_') || property.endsWith('_id')) {
        return true;
    }

    // idUser
    if (property.startsWith('id') && (property.length > 2 && property.charAt(2) === property.charAt(2).toUpperCase())) {
        return true;
    }

    return false;
}

export const getPropertyMock = (property, type, schema) => {
    return `${property}: ${getPropertyMockValue(property, type, schema)}`;
}

export const mockObjectValue = (type) => `create${type.name}Factory()`;

export const mockArrayValues = (property, type, schema) => {
    const isRequired = type.required.indexOf(property) > -1,
        itemType = getTypeFromSchema(`${property}Items`, schema.items);
    return `Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => ${getPropertyMockValue(`${property}.items`, type, schema.items)})${isRequired ? ` as NonEmptyArray<${itemType}>` : ''}`;
}

export const mockStringValue = (schema) => {
    switch (schema.format) {
        case 'email':
            return 'faker.internet.email()';
        case 'uuid':
            return 'faker.string.uuid()';
        case 'uri':
        case 'hostname':
            return 'faker.internet.url()';
        case 'ip':
        case 'ipv4':
            return 'faker.internet.ipv4()';
        case 'ipv6':
            return 'faker.internet.ipv6()';
        case 'token':
            return 'faker.internet.jwt()';
        default:
            return 'faker.lorem.words({ min: 1, max: 3 })';
    }
}

export const mockNumberValue = schema => {
    const min = schema.minimum ?? 1,
        max = schema.maximium ?? undefined,
        exclusiveMinimum = schema.exclusiveMinimum ?? false,
        exclusiveMaximum = schema.exclusiveMaximum ?? false,
        multipleOf = schema.multipleOf ?? undefined,
        type = schema.type === 'integer' ? 'int' : 'float';

    const finalMinimum = exclusiveMinimum ? min + 1 : min,
        finalMaximum = max ? (exclusiveMaximum ? max - 1 : max) : undefined,
        maximumString = typeof undefined === typeof finalMaximum ? '' : `max: ${finalMaximum},`,
        multipleOfString = typeof undefined === typeof multipleOf ? '' : `multipleOf: ${multipleOf}`;

    return `faker.number.${type}({ min: ${finalMinimum}, ${maximumString}${multipleOfString} })`
}

export const getPropertyMockValue = (property, type, schema) => {
    if (schema.properties) {
        return mockObjectValue(type);
    }

    if (schema.enum) {
        const enumName = getTypeFromSchema(property, schema);
        return `faker.helpers.enumValue(${enumName})`;
    }

    const isIdField = maybeIdField(property, schema);
    if (isIdField) { // this is currently just int/string
        return `faker.${schema.type === 'string' ? 'string' : 'number'}.${schema.type === 'string' ? 'uuid()' : 'int({ min: 100, max: 999 })'}`;
    }

    // allow customizing if you really want to from yaml
    if (typeof undefined !== typeof schema['x-faker']) {
        const fakerImpl = schema['x-faker'];
        return `faker.${fakerImpl}`
    }

    switch (schema.type) {
        case 'array':
            return mockArrayValues(property, type, schema);
        case 'boolean':
            return 'faker.datatype.boolean()';
        case 'integer':
        case 'number':
            return mockNumberValue(schema);
        case 'date':
        case 'date-time':
            return 'faker.date.anytime()';
        case 'string':
        default:
            return mockStringValue(schema);
    }
}
