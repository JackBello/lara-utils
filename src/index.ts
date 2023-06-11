import { depPath } from "dependencies"
import { TFunction, TTypeData } from "./types.ts";

export const existFile = async (path: string) => {
    try {
        await Deno.stat(path);
        return true;
    } catch (error) {
        error;
        return false;
    }
}

const convertTextToArray = (text: string) => {
    try {
        return eval(text)
    } catch (error) {
        error;
        return text;
    }
}

export const convertTextToJson = (text: string) => {
    try {
        return JSON.parse(text);
    } catch (error) {
        error;
        return text;
    }
}

export const convertTextToExpression = (expression: any) => {
    if ((expression.startsWith("[") && expression.endsWith("]")))
        return convertTextToArray(expression);
    if ((expression.startsWith("{") && expression.endsWith("}")))
        return convertTextToJson(expression);
    if (expression === "undefined")
        return undefined;
    if (expression === "null")
        return null;
    if (expression === "true" || expression === "false")
        return Boolean(expression);
    if (isNaN(Number(expression)))
        return String(expression);
    return Number(expression);
}

export const convertExpressionToText = (expression: any) => {
    if (typeof expression === "string")
        return `"${expression}"`;
    if (typeof expression === "number")
        return `${expression}`;
    if (typeof expression === "boolean")
        return `${expression}`;
    if (typeof expression === "object")
        return JSON.stringify(expression);
    if (typeof expression === "function")
        return `${expression}`;
    return expression;
}

export const variableDump = (expression: any, depth = 10) => {
    const seen = new Set();

    const inspect = (object: any, depth: number): string => {
        if (depth === 0)
            return '...';

        if (object === null)
            return 'null';

        if (object === undefined)
            return 'undefined';

        if (typeof object === 'string')
            return `"${object}"`;

        if (typeof object === 'number' || typeof object === 'boolean')
            return object.toString();

        if (typeof object === 'function')
            return `[Function: ${object.name}]`;

        if (Array.isArray(object)) {
            if (seen.has(object))
                return '[Circular]';

            seen.add(object);

            const items = object.map((item) => inspect(item, depth - 1));

            seen.delete(object);

            return `[${items.join(', ')}]`;
        }

        if (typeof object === 'object') {
            if (seen.has(object))
                return '[Circular]';

            seen.add(object);

            const items = Object.entries(object).map(([key, value]) => {
                return `${key}: ${inspect(value, depth - 1)}`;
            });

            seen.delete(object);

            return `{ ${items.join(', ')} }`;
        }

        return '';
    }

    return inspect(expression, depth)
}

export const isset = (accessor: any) => typeof accessor !== "undefined" && accessor !== null;

export const empty = (accessor: any) => typeof accessor === 'undefined' || accessor === null || accessor === '';

export const unless = (accessor: any) => !accessor;

export const isURL = (url: string) => /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(url);

export const isClass = (abstract: any) => typeof abstract === "function" && abstract.toString().indexOf("class") !== -1 ? true : false;

export const getFullPath = (path: string, relative = false, isImport = false) => {
    path = path.startsWith("/") ? path : `/${path}`;
    path = path.replace(/\\/g, "/");

    if (relative) return path;

    if (isImport) return depPath.toFileUrl(`${Deno.cwd()}${path}`).toString();
    return `${Deno.cwd()}${path}`;
}

export const removePlural = (word: string) => {
    const irregulars: any[][] = [
        // Irregular plural forms
        ['children', 'child'],
        ['people', 'person'],
        // Agreements in "-es"
        ['potatoes', 'potato'],
        ['tomatoes', 'tomato'],
        // Words ending in "-ies" -> "-y"
        ['(.*)ies$', '$1y'],
        // Words ending in "-ves" -> "f" or "fe"
        ['(.*)ves$', (_: any, p1: string) => {
            if (['leaf', 'knife', 'life', 'wife'].includes(p1)) {
                return p1 + 'e';
            } else {
                return p1 + 'f';
            }
        }],
        // Words ending in "-es" -> remove "es"
        ['(.*)([csx])es$', '$1$2'],
        // Words ending in "-s" -> remove "s"
        ['(.*)([^\s])s$', '$1$2'],
    ];

    for (const [plural, singular] of irregulars) {
        const regex = new RegExp(plural, 'i');
        if (regex.test(word)) {
            return word.replace(regex, singular);
        }
    }

    return word;
}

export const validateType = (expression: any, type: TTypeData) => {
    const validators: Record<string, TFunction> = {
        "String": (value: any) => typeof value === "string",
        "Number": (value: any) => typeof value === "number",
        "Array": (value: any) => Array.isArray(value),
        "Object": (value: any) => typeof value === "object",
        "Boolean": (value: any) => typeof value === "boolean",
        "Null": (value: any) => value === null,
        "Undefined": (value: any) => value === undefined,
        "Map": (value: any) => value instanceof Map,
        "Set": (value: any) => value instanceof Set,
        "Date": (value: any) => value instanceof Date,
        "RegExp": (value: any) => value instanceof RegExp,
        "Uint8Array": (value: any) => value instanceof Uint8Array,
        "Bigint": (value: any) => typeof value === "bigint"
    }

    if (Array.isArray(type)) {
        type.forEach((type: any) => {
            if(!validators[type](expression)) {
                throw new Deno.errors.InvalidData(`the value (${expression}) is not of this type ${type.toUpperCase()}`)
            }
        })
    } else if (!validators[type](expression)) {
        throw new Deno.errors.InvalidData(`the value (${expression}) is not of this type ${type.toUpperCase()}`)
    }
}