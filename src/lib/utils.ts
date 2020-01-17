const _reservedProps = ['action', 'result', 'current_api_version'];

const _isArray = (i: unknown) => Array.isArray(i);
const _isObject = (i: unknown) => i === Object(i) && !_isArray(i) && typeof i !== 'function';
const _camelCase = (i: string) => i.replace(/([-_][a-z])/ig, l => l.toUpperCase().replace('-', '').replace('_', ''));
const _snakeCase = (i: string) => i.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);

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

export const buildResponse = <T>(input: unknown): T => {
  if (_isObject(input)) {
    const response = input as any['response'];
    if (response) {
      const index = Object.keys(response).filter(i => _reservedProps.indexOf(i) === -1);
      return buildResponse(response[index as any]);
    }
    const n = {};
    Object.keys(input as any).forEach((k) =>
      (n[_camelCase(k)] = buildResponse((input as any)[k])));
    return n as any;
  } else if (Array.isArray(input)) {
    return (input as any).map((i) => buildResponse(i));
  } else if (typeof input === 'string') {
    if (input.match(/^\d{1,15}$/)) {
      return parseInt(input) as any;
    } else if (input === 'yes' || input === 'true') {
      return true as any;
    } else if (input === 'no' || input === 'false') {
      return false as any;
    }
  }
  return input as T;
};
