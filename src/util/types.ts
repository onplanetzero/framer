import _ from 'lodash';
import {
    type Schema,
    type ArraySchema,
    type TypeDef,
    type LookupTypes,
    type SchemaMap
} from '../core/types'

/**
 * decorateWithType
 * 
 * Decorates an object with __ref pointing to its originating schema name if possible
 */
export const decorateWithType = (schemaName: string, schema: Schema): Schema => {
    const type = {
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
 */
export const decorateWithLookupTypes = (schema: Schema, lookupTypes: LookupTypes): Schema => {
    if (isPrimitive(schema)) {
        return schema;
    }

    const lookupTypeValues: string[] = _.values(lookupTypes),
        lookupTypeKeys: string[] = _.keys(lookupTypes);

    // Collection
    // schema.items found in list of already created schemas, we'll decorate it with a type def
    if (isCollection(schema)) {
        const arrayItemSchema = getArrayItemsSchema(<ArraySchema>schema),
            index = _.findIndex(lookupTypeValues, json => json == JSON.stringify(arrayItemSchema));

        let collectionSchema = <ArraySchema>schema; // eslint-disable-line prefer-const
        if (index > -1) {
            collectionSchema.items = decorateWithType(lookupTypeKeys[index], arrayItemSchema);
        }
        return collectionSchema;
    }

    // Object properties
    //  object has a property that matches a type definition so we'll decorate it
    if (schema.properties !== undefined) { // is object
        const properties: SchemaMap = schema.properties;
        const propertyKeys: string[] = Object.keys(schema.properties);
        _.map(propertyKeys, (property: string): void => {
            if (undefined === properties[property]) {
                return;
            }
            const propertySchema: Schema = properties[property];
            properties[property] = decorateWithLookupTypes(propertySchema, lookupTypes);
        });

        schema.properties = properties;
    }

    const index: number = _.findIndex(lookupTypeValues, json => json == JSON.stringify(schema))
    if (index > -1) {
        return decorateWithType(lookupTypeKeys[index], schema);
    }

    return schema;
}

/**
 * getTypeFromPrimitive
 * 
 * Gets the primitive type used for typescript for a given schema
 */
export const getTypeFromPrimitive = (schema: Schema): string => {
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
 */
export const getTypeFromArraySchema = (schemaName: string, schema: ArraySchema): string => {
    const itemsSchema: Schema = schema.items;

    let itemSchemaType: string = '';
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
 */
export const getTypeFromSchema = (schemaName: string, schema: Schema): string => {
    if (schema.enum !== undefined) {
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
 * Checks if a schema is representative of a primitive type, and not an object or array
 */
export const isPrimitive = (schema: Schema): boolean => schema.type !== 'object' && schema.type !== 'array';

/**
 * isTypePrimitive
 * 
 * Checks if a type string is representative of a primitive value in typescript
 */
export const isTypePrimitive = (string: string): boolean => _.findIndex([
    'string',
    'number',
    'bigint',
    'boolean',
    'undefined',
    'symbol',
    'null',
], str => str === string) > -1;

/**
 * isCollection
 * 
 * Determines if an array schema is a collection
 */
export const isCollection = (schema: Schema): boolean => {
    if (schema.type === 'array' && schema.items !== undefined && !isPrimitive(schema.items)) {
        return true;
    }
    return false;
}

/**
 * getItemsSchema
 * 
 * 
 */
export const getArrayItemsSchema = (schema: ArraySchema): Schema => {
    return schema.items
}

/**
 * containsChildSchemas
 * 
 * Determines if a schema contains nested non-primitive schemas in either array items or
 * object properties
 */
export const containsChildSchemas = (schema: Schema): boolean => {
    if (isPrimitive(schema)) {
        return false;
    }

    if ('array' === schema.type && schema.items !== undefined && !isPrimitive(schema.items)) {
        return true;
    } else if ('array' === schema.type) {
        return false;
    }
    return true;
}

/**
 * getTypesFromSchema
 * 
 * Gets type definitions from a schema, checking the parent and the nested child schemas
 */
export const getTypesFromSchema = (schemaName: string, schema: Schema): TypeDef[] => {
    // flat objects 
    if (!containsChildSchemas(schema)) {
        return [{
            name: schemaName,
            definition: getTypeFromSchema(schemaName, schema),
        }];
    }

    // collections
    if (isCollection(schema)) {
        const arraySchema = <ArraySchema>schema;
        return [
            // any schemas generated from collection items
            ...getTypesFromSchema(arraySchema.items.__ref ?? 'object', arraySchema.items) // in this case we don't need the originating shema because we've already added it
        ];
    }

    // objects
    // this could be a nested object so we recursively search it and merge
    if (schema.properties !== undefined) {
        const properties: SchemaMap = schema.properties,
            propertyKeys: string[] = _.keys(schema.properties),
            required: string[] = schema.required ?? [];

        let definitions: TypeDef[] = [],
            definition: Record<string, string> = {};
        _.map(propertyKeys, property => {
            const propertySchema: Schema = properties[property];
            definition = {
                ...definition,
                [property]: getTypeFromSchema(property, propertySchema),
            };

            if (containsChildSchemas(propertySchema)) {
                Array.prototype.push.apply(definitions, getTypesFromSchema(property, propertySchema));
            }

            if (propertySchema.enum !== undefined && propertySchema.type == 'string') {
                definitions = [
                    ...definitions,
                    {
                        name: _.capitalize(property) + 'Enum',
                        type: 'enum',
                        definition: {},
                        enumType: propertySchema.type,
                        enum: propertySchema.enum
                    }
                ]
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

export const getStaticTypes = (): string => 'export type NonEmptyArray<T> = [T, ...T[]];';

export const getPrefixedType = (type: string, prefix: string = ''): string => {
    if (isTypePrimitive(type)) {
        return type;
    }
    return prefix + type;
}

export const generatePropertyDefinition = (type: TypeDef, property: string, typePrefix: string = ''): string => {
    if (typeof type.definition !== 'object') {
        throw `Tried to generate a property definition for a non-object parent ${JSON.stringify(type)}`
    }

    const definition: Record<string, string> = type.definition,
        isRequired = _.findIndex(type.required, str => str === property) > -1;

    let propertyDefinition = definition[property],
        propertyName = property;
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

export const generateAccessMethods = (type: TypeDef, property: string, typePrefix: string = '') => {
    if (typeof type.definition !== 'object' || type.definition === undefined) {
        throw 'Tried to generate access methods for an invalid definition ' + JSON.stringify(type);
    }

    const accessorTypeName: string = _.startCase(property).replace(/\s/g, ''),
        isRequired: boolean = _.findIndex(type.required, str => str === property) > -1,
        getterName: string = `get${accessorTypeName}`,
        setterName: string = `set${accessorTypeName}`,
        typeString: string = type.definition[property];

    let outType: string = typeString,
        isArray: boolean = false;
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
    `;
}

export const getEnumValues = (enumArray: string[] | undefined = []): string[] => enumArray;
