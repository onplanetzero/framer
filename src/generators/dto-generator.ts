import { Generator } from "./generator";
import _ from "lodash";
import { writeFileHeader } from "../util/file";
import {
    generatePropertyDefinition,
    generateAccessMethods,
} from "../util/types";
import { GeneratorTarget, type GeneratorInterface } from "../core/types";

export class DTOGenerator extends Generator implements GeneratorInterface {
    name = "dto";
    target = GeneratorTarget.SingleFile;
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

            export class ${type.name}Dto extends Dto {
                private _dto_properties: string[] = [${_.map(properties, prop => `'${prop}'`).join(',')}];
                ${_.map(properties, (property) => `private _${generatePropertyDefinition(type, property, "generatedTypes.")}`).join(";\n")}
                
                constructor(obj?: ${type.name}Like) {
                    super()

                    if(obj === undefined) {
                        return;
                    }
                    
                    this.map(obj);
                }

                map = (obj: ${type.name}Like): void => {
                    for(const property in this._dto_properties) {
                        if(typeof undefined == typeof obj[property] || null === obj[property]) {
                            continue;
                        }

                        this[property] = obj[property];
                    }
                }

                ${_.map(properties, (property) => `${generateAccessMethods(type, property, "generatedTypes.")}`).join("\n")}
            }
            `;
        });

        return generated;
    };
}
