import SwaggerParser from "@apidevtools/swagger-parser";
import { type Document } from "../core/types";
/**
 * parse
 * 
 * @param {string} api path to api file
 * @returns {Promise}
 */
export const parse = async (api: string): Promise<Document> => {
    let parsedApi: Document = <Document>await SwaggerParser.validate(api);
    return parsedApi;
}

export const keywords: string[] = [
    'type',
    'required',
];


``
