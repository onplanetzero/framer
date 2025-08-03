import SwaggerParser from "@apidevtools/swagger-parser";

/**
 * parse
 * 
 * @param {string} api path to api file
 * @returns {Promise}
 */
export const parse = async (api) => {
  let parsedApi;
  try {
    parsedApi = await SwaggerParser.validate(api);
  } catch(e) {
    console.error(e);
  }

  return parsedApi;
}

export const keywords = [
  'type',
  'required',
];


