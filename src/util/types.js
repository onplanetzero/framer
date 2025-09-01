import _ from 'lodash';

/**
 * decorateWithType
 * 
 * Decorates an object with __ref pointing to its originating schema name if possible
 * 
 * @param {string} schemaName 
 * @param {object} schema 
 * @returns {object}
 */
export const decorateWithType = (schemaName, schema) => {
    let type = {
        ...schema
    }

    if (schema.type == 'object') {
        Object.defineProperty(type, '__ref', {
            value: schemaName,
            writable: false,
            enumerable: false
        });
    }

    return type;
}

/**
 * decorateWithLookupTypes
 * 
 * Decorates nested objects with types looked up from already created root api types.  For instance,
 * if we've already created a type for a model used in a collection, we don't want to duplicate 
 * that type so we decorate it with a __ref.  To compare nested object definitions, we keep a
 * JSON stringified dictionary to look them up from, which is passed as lookupTypes
 * 
 * @param {object} schema schema being decorated with nested refs if needed
 * @param {object} lookupTypes dictionary of stringified api types already created for lookups
 * @returns {object}
 */
export const decorateWithLookupTypes = (schema, lookupTypes) => {
    if (isPrimitive(schema)) {
        return schema;
    }

    const lookupTypeValues = _.values(lookupTypes),
        lookupTypeKeys = _.keys(lookupTypes);

    // Collection
    // schema.items found in list of already created schemas, we'll decorate it with a type def
    if (isCollection(schema)) {
        const index = _.findIndex(lookupTypeValues, json => json == JSON.stringify(schema.items));
        if (index > -1) {
            schema.items = decorateWithType(lookupTypeKeys[index], schema.items);
        }
        return schema;
    }

    // Object properties
    //  object has a property that matches a type definition so we'll decorate it
    if (schema.properties) { // is object
        const properties = _.keys(schema.properties);
        _.map(properties, property => {
            const propertySchema = schema.properties[property];
            schema.properties[property] = decorateWithLookupTypes(propertySchema, lookupTypes);
        });
    }

    const index = _.findIndex(lookupTypeValues, json => json == JSON.stringify(schema))
    if (index > -1) {
        return decorateWithType(lookupTypeKeys[index], schema);
    }

    return schema;
}

/**
 * getTypeFromPrimitive
 * 
 * Gets the primitive type used for typescript for a given schema
 * 
 * @param {object} schema 
 * @returns {string}
 */
export const getTypeFromPrimitive = (schema) => {
    switch (schema.type) {
        case 'integer':
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        default:
            return 'string';
    }
}

/**
 * getTypeFromArraySchema
 * 
 * Gets the type field for an array schema with complex or primitive items
 * 
 * @param {string} schemaName 
 * @param {object} schema 
 * @returns {string}
 */
export const getTypeFromArraySchema = (schemaName, schema) => {
    if (!schema.items) {
        throw new Error('Item is not an array');
    }
    const itemsSchema = schema.items;

    let itemSchemaType = '';
    switch (itemsSchema.type) {
        case 'object':
            itemSchemaType = itemsSchema.__ref ? itemsSchema.__ref + '[]' : 'object[]';
            break;
        default:
            itemSchemaType = getTypeFromPrimitive(itemsSchema) + '[]';
            break;
    }

    return itemSchemaType;
}

/**
 * getTypeFromSchema
 * 
 * Gets the string type used for a field from an open api field schema
 * 
 * @param {string} schemaName 
 * @param {object} schema 
 * @returns {string}
 */
export const getTypeFromSchema = (schemaName, schema) => {
    if (schema.enum) {
        return _.capitalize(schemaName) + 'Enum';
    }
    switch (schema.type) {
        case 'object':
            return schema.__ref ?? 'object';
        case 'array':
            return getTypeFromArraySchema(schemaName, schema);
        default:
            return getTypeFromPrimitive(schema);
    }
}

/**
 * isPrimitive
 * 
 * @param {object} schema 
 * @returns {boolean}
 */
export const isPrimitive = (schema) => schema.type !== 'object' && schema.type !== 'array';

/**
 * isTypePrimitive
 * 
 * @param {string} string 
 * @returns {boolean}
 */
export const isTypePrimitive = (string) => ~_.findIndex([
    'string',
    'number',
    'bigint',
    'boolean',
    'undefined',
    'symbol',
    'null',
], str => str === string);

/**
 * isCollection
 * 
 * Determines if an array schema is a collection
 * 
 * @param {object} schema 
 * @returns {boolean}
 */
export const isCollection = (schema) => {
    if (schema.type === 'array' && schema.items && !isPrimitive(schema.items)) {
        return true;
    }
    return false;
}

/**
 * containsChildSchemas
 * 
 * Determines if a schema contains nested non-primitive schemas in either array items or
 * object properties
 * 
 * @param {object} schema 
 * @returns {boolean}
 */
export const containsChildSchemas = (schema) => {
    if (isPrimitive(schema)) {
        return false;
    }

    if ('array' === schema.type && schema.items && !isPrimitive(schema.items)) {
        return true;
    } else if ('array' === schema.type) {
        return false;
    }

    // its an object
    return true;
}

/**
 * getTypesFromSchema
 * 
 * @param {*} schemaName 
 * @param {*} schema 
 * @returns 
 */
export const getTypesFromSchema = (schemaName, schema) => {
    // flat objects 
    if (!containsChildSchemas(schema)) {
        return [{
            name: schemaName,
            definition: getTypeFromSchema(schemaName, schema),
        }];
    }

    // collections
    if (isCollection(schema)) {
        return [
            // any schemas generated from collection items
            ...getTypesFromSchema(schema.items.__ref ?? 'object', schema.items) // in this case we don't need the originating shema because we've already added it
        ];
    }

    // objects
    // this could be a nested object so we recursively search it and merge
    if (schema.properties) {
        const keys = _.keys(schema.properties),
            required = schema.required ?? [];

        let definitions = [],
            definition = {}
        _.map(keys, property => {
            let propertySchema = schema.properties[property];
            definition = {
                ...definition,
                [property]: getTypeFromSchema(property, propertySchema),
            };

            if (containsChildSchemas(propertySchema)) {
                Array.prototype.push.apply(definitions, getTypesFromSchema(property, propertySchema));
            }

            if (propertySchema.enum && propertySchema.type == 'string') {
                definitions.push({
                    name: _.capitalize(property) + 'Enum',
                    type: 'enum',
                    enumType: propertySchema.type,
                    enum: propertySchema.enum
                })
            }
        });

        return [
            { name: schema.__ref ? schema.__ref : schemaName, required, definition },
            ...definitions,
        ];
    }

    // primitive nothing here
    return [];
}

export const getStaticTypes = () => 'export type NonEmptyArray<T> = [T, ...T[]];';

export const getPrefixedType = (type, prefix = '') => {
    if (isTypePrimitive(type)) {
        return type;
    }
    return prefix + type;
}

export const generatePropertyDefinition = (type, property, typePrefix = '') => {
    let propertyDefinition = type.definition[property],
        isRequired = _.findIndex(type.required, str => str === property) > -1,
        propertyName = property

    if (propertyDefinition.includes('[]')) {
        propertyDefinition = propertyDefinition.replace('[]', '');
        if (!isTypePrimitive(propertyDefinition)) {
            propertyDefinition = getPrefixedType(propertyDefinition, typePrefix);
        }
        propertyDefinition = isRequired ? `${typePrefix}NonEmptyArray<${propertyDefinition}>` : `${propertyDefinition}[]`;

        return `${propertyName}: ${propertyDefinition}`;
    }

    if (!isRequired && !isTypePrimitive(propertyDefinition)) {
        propertyDefinition += ' | null | undefined';
    } else if (!isRequired) { // is primitive
        propertyName += '?';
    }

    return `${propertyName}: ${getPrefixedType(propertyDefinition, typePrefix)}`;
}

export const generateAccessMethods = (type, property, typePrefix = '') => {
    const accessorTypeName = _.startCase(property).replace(/\s/g, ''),
        isRequired = _.findIndex(type.required, str => str === property) > -1,
        getterName = `get${accessorTypeName}`,
        setterName = `set${accessorTypeName}`,
        typeDef = type.definition[property];

    let outType = typeDef,
        isArray = false;
    if (outType.includes('[]')) {
        isArray = true;
        outType = outType.replace('[]', '');
        outType = getPrefixedType(outType, typePrefix) + '[]';
    } else {
        outType = getPrefixedType(outType, typePrefix);
    }

    if (!isRequired && !isArray && !isTypePrimitive(outType)) {
        outType += ' | null | undefined';
    } else if (!isRequired && !isArray) {
        outType += ' | undefined';
    } else if (isRequired && isArray) {
        outType = `${typePrefix}NonEmptyArray<${outType.replace('[]', '')}>`;
    }
    return `
        ${setterName} = (value: ${outType}): void => {
            this.${property} = value;
        }
        ${getterName} = (formatted: boolean = false): ${outType} => {
            return this.${property};
        }
    `
}
