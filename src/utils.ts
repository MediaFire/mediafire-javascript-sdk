type Input = object | string | number | boolean;

export const isArray = (i: unknown) => Array.isArray(i);
export const isObject = (i: unknown) => i === Object(i) && !isArray(i) && typeof i !== 'function';
export const camelCase = (i: string) => i.replace(/([-_][a-z])/ig, l => l.toUpperCase().replace('-', '').replace('_', ''));
export const snakeCase = (i: string) => i.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);

export const buildRequest = (input: object): object => {
  if (isObject(input)) {
    const n = {};
    Object.keys(input).forEach((k) => (n[snakeCase(k)] = buildRequest(input[k])));
    return n;
  } else if (Array.isArray(input)) {
    return input.map((i) => buildRequest(i));
  }
  return input;
};

export const buildResponse = (input: Input, cast = true): Input => {
  if (isObject(input)) {
    const n = {};
    Object.keys(input).forEach((k) => (n[camelCase(k)] = buildResponse(input[k])));
    return n;
  } else if (Array.isArray(input)) {
    return input.map((i) => buildResponse(i));
  } else if (cast && typeof input === 'string') {
    if (input.match(/^\d{1,15}$/)) {
      return parseInt(input);
    } else if (input === 'yes' || input === 'true') {
      return true;
    } else if (input === 'no' || input === 'false') {
      return false;
    }
  }
  return input;
};
