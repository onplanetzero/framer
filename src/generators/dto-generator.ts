import { Generator } from "./generator";
import path from "path";
import _ from "lodash";
import { writeFileHeader } from "../util/file";
import {
    generatePropertyDefinition,
    generateAccessMethods,
} from "../util/types";
import { GeneratorTarget, type IGenerator } from "../core/types";

export class DTOGenerator extends Generator implements IGenerator {
    name = "dto";
    target = GeneratorTarget.SingleFile;
    targetLocation = path.resolve(process.cwd(), "./generated");
    targetName = "dto.ts";

    generate = () => {
        const { typeDefinitions } = this.getContext();

        let generated = `
        ${writeFileHeader("dto.ts", "Objects generated in this file represent data transfer objects used for organizing, formatting and/or cleaning objects being sent to the application or being returned from the application.")}

        import * as generatedTypes from './types'

        interface Serializable {
            toJson(): object
        }

        class Dto implements Serializable {
            toJson = () => ({ ...this })
        }

        `;

        _.map(typeDefinitions, (type) => {
            const properties = _.keys(type.definition);
            if (!properties.length) {
                return; // enums are also generated in the type definition and they can't be made classes
            }

            generated += `
            /**
             * ${type.name}Dto
             * 
             * Data transfer object representing generated type ${type.name}
             */
            interface ${type.name}Like extends generatedTypes.${type.name} {
                [key: string]: any; // allow for other things here, hence ${type.name}Like
            }

            export class ${type.name}Dto {
                // properties
                ${_.map(properties, (property) => `${generatePropertyDefinition(type, property, "generatedTypes.")}`).join(";\n")}
                
                constructor(obj: ${type.name}Like | undefined) {
                    if(typeof undefined !== typeof obj) {
                        this.map(obj!);
                    }
                }

                getAccessorMethod = (property: string, accessor: 'get' | 'set') => {
                    return accessor + property.charAt(0).toUpperCase() + property.slice(1);
                }

                map = (obj: ${type.name}Like): void => {
                    for(const property in Object.getOwnPropertyNames(this)) {
                        if(typeof undefined == typeof obj[property] || null === obj[property]) {
                            continue;
                        }

                        this[this.getAccessorMethod(property, 'set')](obj[property]);
                    }
                }

                // accessor methods
                ${_.map(properties, (property) => `${generateAccessMethods(type, property, "generatedTypes.")}`).join("\n")}
            }
            `;
        });

        return generated;
    };
}
