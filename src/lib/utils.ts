export const buildRequest = (input: object): object => {
  if (_isObject(input)) {
    const n = {};
    Object.keys(input).forEach((k) => (n[_snakeCase(k)] = buildRequest(input[k])));
    return n;
  } else if (Array.isArray(input)) {
    return input.map((i) => buildRequest(i));
  }
  return input;
};

export const buildResponse = <T>(input: any): T => {
  if (_isObject(input)) {
    if (input.response) return buildResponse(input.response);
    const n = {};
    Object.keys(input).forEach((k) => (n[_camelCase(k)] = buildResponse((input)[k])));
    return n as any;
  } else if (Array.isArray(input)) {
    return (input as any).map((i: any) => buildResponse(i));
  } else if (typeof input === 'string') {
    if (input.match(/^\d{1,15}$/)) {
      return parseInt(input) as any;
    } else if (_negatives.indexOf(input) !== -1) {
      return false as any;
    } else if (_affirmatives.indexOf(input) !== -1) {
      return true as any;
    }
  }
  return input as T;
};

const _negatives = ['no', 'false', 'off'];
const _affirmatives = ['yes', 'true', 'on'];
const _isArray = (i: unknown) => Array.isArray(i);
const _isObject = (i: unknown) => i === Object(i) && !_isArray(i) && typeof i !== 'function';
const _camelCase = (i: string) => i.replace(/([-_][a-z])/ig, l => l.toUpperCase().replace('-', '').replace('_', ''));
const _snakeCase = (i: string) => i.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
