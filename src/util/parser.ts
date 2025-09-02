import SwaggerParser from "@apidevtools/swagger-parser";
import { type Document } from "../core/types";
/**
 * parse
 *
 * @param {string} api path to api file
 * @returns {Promise}
 */
export const parse = async (api: string): Promise<Document> =>
    <Document>await SwaggerParser.validate(api);

export const keywords: string[] = ["type", "required"];
