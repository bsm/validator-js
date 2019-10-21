// tslint:disable: no-any

export interface ValidationError {
  error: string;
  options?: { [key: string]: any };
}

abstract class Validation {
  constructor(attrs?: any) {
    if (attrs) {
      Object.assign(this, attrs);
    }
  }
  abstract check(v: any): ValidationError | undefined;
}

class VPresence extends Validation {
  constructor(attrs?: Partial<VPresence>) {
    super(attrs);
  }

  check(v: any): ValidationError | undefined {
    if (isBlank(v)) {
      return { error: 'presence' };
    }
    return undefined;
  }
}

class VLength extends Validation {
  is?: number;
  min?: number;
  max?: number;

  constructor(attrs?: Partial<VLength>) {
    super(attrs);
  }

  check(v: any): ValidationError | undefined {
    if (isBlank(v)) return undefined;

    const length = v.length;
    if (!isNumber(length)) {
      return { error: 'invalid' };
    }

    if (this.is != null && length !== this.is) {
      return { error: 'wrongLength', options: { count: this.is } };
    }

    if (this.min != null && length < this.min) {
      return { error: 'tooShort', options: { count: this.min } };
    }

    if (this.max != null && length > this.max) {
      return { error: 'tooLong', options: { count: this.max } };
    }

    return undefined;
  }
}

class VNumericality extends Validation {
  greaterThan?: number;
  greaterThanOrEqualTo?: number;
  equalTo?: number;
  lessThan?: number;
  lessThanOrEqualTo?: number;
  divisibleBy?: number;
  onlyInteger?: boolean;

  constructor(attrs?: Partial<VNumericality>) {
    super(attrs);
  }

  check(v: any): ValidationError | undefined {
    if (isBlank(v)) return undefined;

    if (isString(v)) {
      v = Number(v);
    }
    if (!isNumber(v)) {
      return { error: 'invalid' };
    }
    if (this.onlyInteger === true && !isInteger(v)) {
      return { error: 'notInteger' };
    }
    if (this.greaterThan != null && v <= this.greaterThan) {
      return { error: 'greaterThan', options: { count: this.greaterThan } };
    }
    if (this.greaterThanOrEqualTo != null && v < this.greaterThanOrEqualTo) {
      return { error: 'greaterThanOrEqualTo', options: { count: this.greaterThanOrEqualTo } };
    }
    if (this.equalTo != null && v !== this.equalTo) {
      return { error: 'equalTo', options: { count: this.equalTo } };
    }
    if (this.lessThan != null && v >= this.lessThan) {
      return { error: 'lessThan', options: { count: this.lessThan } };
    }
    if (this.lessThanOrEqualTo != null && v > this.lessThanOrEqualTo) {
      return { error: 'lessThanOrEqualTo', options: { count: this.lessThanOrEqualTo } };
    }
    if (this.divisibleBy != null && v % this.divisibleBy !== 0) {
      return { error: 'divisibleBy', options: { count: this.divisibleBy } };
    }
    return undefined;
  }
}

class VInclusion extends Validation {
  values?: any[];
  enum?: any;

  constructor(attrs?: Partial<VInclusion>) {
    super(attrs);

    if (this.enum != null && this.values == null) {
      this.values = Object.keys(this.enum)
        .map(v => Number(v))
        .filter(v => !isNaN(v));
    }
    this.enum = undefined;
  }

  check(v: any): ValidationError | undefined {
    if (!isDefined(v)) return undefined;
    if (isString(v) && isBlank(v)) return undefined;

    if (this.values == null || this.values.indexOf(v) < 0) {
      return { error: 'inclusion', options: { values: this.values } };
    }
    return undefined;
  }
}

class VFormat extends Validation {
  pattern?: RegExp;
  details?: string;

  constructor(attrs?: Partial<VFormat>) {
    super(attrs);
  }

  check(v: any): ValidationError | undefined {
    if (!isDefined(v)) return undefined;
    if (isString(v) && isBlank(v)) return undefined;

    if (this.pattern == null || !this.pattern.test(v)) {
      return { error: 'invalid', options: { details: this.details } };
    }
    return undefined;
  }
}

// --------------------------------------------------------------------

type FieldRule = (v: any) => string | boolean;

interface FieldValidatorOptions {
  presence?: Partial<VPresence>;
  length?: Partial<VLength>;
  numericality?: Partial<VNumericality>;
  inclusion?: Partial<VInclusion>;
  format?: Partial<VFormat>;
}

class FieldValidator {
  checks: Validation[] = [];

  constructor(opts: FieldValidatorOptions) {
    if (opts.presence != null) this.checks.push(new VPresence(opts.presence));
    if (opts.length != null) this.checks.push(new VLength(opts.length));
    if (opts.numericality != null) this.checks.push(new VNumericality(opts.numericality));
    if (opts.inclusion != null) this.checks.push(new VInclusion(opts.inclusion));
    if (opts.format != null) this.checks.push(new VFormat(opts.format));
  }

  check(v: any): ValidationError | undefined {
    for (const c of this.checks) {
      const err = c.check(v);
      if (err) {
        return err;
      }
    }
    return undefined;
  }

  rules(translate?: (err: ValidationError) => string): FieldRule[] {
    const res: FieldRule[] = [];
    for (const c of this.checks) {
      const rule = (v: any): string | boolean => {
        const err = c.check(v);
        if (err != null) {
          return (translate || translateDefault)(err);
        }
        return true;
      };
      res.push(rule);
    }
    return res;
  }
}

// --------------------------------------------------------------------

type ValidatorOptions<T> = {
  [K in keyof Partial<T>]?: FieldValidator;
};

type ValidatorErrors<T> = {
  [K in keyof Partial<T>]?: ValidationError;
};

type ValidatorRules<T> = {
  [K in keyof Partial<T>]?: FieldRule[];
};

export class Validator<T> {
  rules: ValidatorRules<T> = {};
  private fields: ValidatorOptions<T> = {};

  constructor(opts: { [K in keyof Partial<T>]: FieldValidatorOptions }) {
    for (const key in opts) {
      if (opts.hasOwnProperty(key)) {
        const fv = new FieldValidator(opts[key]);
        this.fields[key] = fv;
        this.rules[key] = fv.rules();
      }
    }
  }

  isValid(schema: T): boolean {
    for (const name in this.fields) {
      if (this.check(name, schema[name]) !== undefined) {
        return false;
      }
    }
    return true;
  }

  validate(schema: T): ValidatorErrors<T> {
    const errs: ValidatorErrors<T> = {};
    for (const name in this.fields) {
      if (this.fields.hasOwnProperty(name)) {
        const err = this.check(name, schema[name]);
        if (err !== undefined) {
          errs[name] = err;
        }
      }
    }
    return errs;
  }

  field(name: keyof ValidatorOptions<T>): FieldValidator | undefined {
    return this.fields[name];
  }

  check(name: keyof ValidatorOptions<T>, value: any): ValidationError | undefined {
    const fv = this.field(name);
    return fv != null ? fv.check(value) : undefined;
  }
}

export default Validator;

// --------------------------------------------------------------------

const EMPTY_STRING_REGEXP = /^\s*$/;

function isDefined(v: any): boolean {
  return v !== null && v !== undefined;
}

function isString(v: any): boolean {
  return typeof v === 'string';
}

function isNumber(v: any) {
  return typeof v === 'number' && !isNaN(v);
}

function isInteger(v: any) {
  return isNumber(v) && v % 1 === 0;
}

function isBlank(v: any): boolean {
  if (!isDefined(v)) {
    return true;
  }
  if (isString(v)) {
    return EMPTY_STRING_REGEXP.test(v);
  }
  if (isNumber(v)) {
    return false;
  }
  return true;
}

// --------------------------------------------------------------------

const translations: { [key: string]: string } = {
  invalid: 'is invalid',
  presence: "can't be blank",
  wrongLength: 'is the wrong length (should be {{count}} characters)',
  tooShort: 'is too short (minimum is {{count}} characters)',
  tooLong: 'is too long (maximum is {{count}} characters)',
  notInteger: 'is not an integer',
  greaterThan: 'must be greater than {{count}}',
  greaterThanOrEqualTo: 'must be greater than or equal to {{count}}',
  equalTo: 'equal to {{count}}',
  lessThan: 'must be less than {{count}}',
  lessThanOrEqualTo: 'must be less than or equal to {{count}}',
  divisibleBy: 'must be divisible by {{count}}',
};

const TRANSLATE_REGEXP = /\{\{(\w+)\}\}/g;

function translateDefault(err: ValidationError): string {
  const msg = translations[err.error] || 'is invalid';
  const opt = err.options || {};
  return msg.replace(TRANSLATE_REGEXP, (_: string, m: string) => {
    return String(opt[m]);
  });
}
