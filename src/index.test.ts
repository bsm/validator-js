import Validator from './index';

enum MockEnum {
  A,
  B,
  C,
}

enum StringEnum {
  A = 'a',
  B = 'b',
  C = 'c',
}

interface MockStruct {
  title?: string;
  count?: number;
  kind?: MockEnum;
  type?: StringEnum;
}

describe('Validator', () => {
  let subject: Validator<MockStruct>;

  it('should generate rules', () => {
    subject = new Validator<MockStruct>({
      title: { presence: {}, length: { max: 2 } },
      kind: { inclusion: { enum: MockEnum } },
    });

    expect(subject.rules).toHaveProperty('title');
    expect(subject.rules).toHaveProperty('kind');

    const title = subject.rules.title || [];
    expect(title).toHaveLength(2);
    expect(title[0](undefined)).toEqual("can't be blank");
    expect(title[0]('')).toEqual("can't be blank");
    expect(title[0]('ok')).toBe(true);

    expect(title[1]('bad')).toBe('is too long (maximum is 2 characters)');
    expect(title[1]('ok')).toBe(true);
  });

  it('should validate', () => {
    subject = new Validator<MockStruct>({
      title: { presence: {} },
      kind: { inclusion: { enum: MockEnum } },
    });

    expect(subject.validate({ kind: 7 } as MockStruct)).toEqual({
      title: { error: 'presence' },
      kind: { error: 'inclusion', options: { values: [0, 1, 2] } },
    });
  });

  it('should validate presence', () => {
    subject = new Validator<MockStruct>({
      title: { presence: {} },
    });
    expect(subject.check('title', undefined)).toEqual({ error: 'presence' });
    expect(subject.check('title', '')).toEqual({ error: 'presence' });
    expect(subject.check('title', '  ')).toEqual({ error: 'presence' });
    expect(subject.check('title', 'value')).toBeUndefined();
  });

  it('should validate length', () => {
    subject = new Validator<MockStruct>({
      title: { length: { min: 2, max: 10 } },
    });

    expect(subject.check('title', undefined)).toBeUndefined();
    expect(subject.check('title', null)).toBeUndefined();
    expect(subject.check('title', 33)).toEqual({ error: 'invalid' });
    expect(subject.check('title', 'x')).toEqual({ error: 'tooShort', options: { count: 2 } });
    expect(subject.check('title', 'xxxxxxxxxxx')).toEqual({
      error: 'tooLong',
      options: { count: 10 },
    });
    expect(subject.check('title', 'value')).toBeUndefined();
  });

  it('should validate numericality (>=/<=)', () => {
    subject = new Validator<MockStruct>({
      count: { numericality: { greaterThanOrEqualTo: 2, lessThanOrEqualTo: 10 } },
    });

    expect(subject.check('count', undefined)).toBeUndefined();
    expect(subject.check('count', null)).toBeUndefined();
    expect(subject.check('count', '')).toBeUndefined();

    expect(subject.check('count', 'x')).toEqual({ error: 'invalid' });
    expect(subject.check('count', 1.99)).toEqual({
      error: 'greaterThanOrEqualTo',
      options: { count: 2 },
    });
    expect(subject.check('count', 10.01)).toEqual({
      error: 'lessThanOrEqualTo',
      options: { count: 10 },
    });

    expect(subject.check('count', 2)).toBeUndefined();
    expect(subject.check('count', 10)).toBeUndefined();
    expect(subject.check('count', 5)).toBeUndefined();
  });

  it('should validate numericality (>,<)', () => {
    subject = new Validator<MockStruct>({
      count: { numericality: { greaterThan: 2, lessThan: 10 } },
    });

    expect(subject.check('count', undefined)).toBeUndefined();
    expect(subject.check('count', null)).toBeUndefined();
    expect(subject.check('count', '')).toBeUndefined();

    expect(subject.check('count', 'x')).toEqual({ error: 'invalid' });
    expect(subject.check('count', 2)).toEqual({ error: 'greaterThan', options: { count: 2 } });
    expect(subject.check('count', 10)).toEqual({ error: 'lessThan', options: { count: 10 } });

    expect(subject.check('count', 2.01)).toBeUndefined();
    expect(subject.check('count', 9.99)).toBeUndefined();
    expect(subject.check('count', 5)).toBeUndefined();
  });

  it('should validate numericality (zero-bound)', () => {
    subject = new Validator<MockStruct>({
      count: { numericality: { greaterThanOrEqualTo: 0, lessThanOrEqualTo: 0 } },
    });

    expect(subject.check('count', -0.1)).toEqual({
      error: 'greaterThanOrEqualTo',
      options: { count: 0 },
    });
    expect(subject.check('count', 0.1)).toEqual({
      error: 'lessThanOrEqualTo',
      options: { count: 0 },
    });
    expect(subject.check('count', 0)).toBeUndefined();
  });

  it('should validate numericality (onlyInteger, divisibleBy)', () => {
    subject = new Validator<MockStruct>({
      count: { numericality: { onlyInteger: true, divisibleBy: 3 } },
    });

    expect(subject.check('count', 'x')).toEqual({ error: 'invalid' });
    expect(subject.check('count', 2.1)).toEqual({ error: 'notInteger' });
    expect(subject.check('count', 5)).toEqual({ error: 'divisibleBy', options: { count: 3 } });
    expect(subject.check('count', 6)).toBeUndefined();
  });

  it('should validate inclusion', () => {
    subject = new Validator<MockStruct>({
      kind: { inclusion: { enum: MockEnum } },
    });
    const kerr = { error: 'inclusion', options: { values: [0, 1, 2] } };

    expect(subject.check('kind', undefined)).toBeUndefined();
    expect(subject.check('kind', null)).toBeUndefined();
    expect(subject.check('kind', '')).toBeUndefined();

    expect(subject.check('kind', 'z')).toEqual(kerr);
    expect(subject.check('kind', '2')).toEqual(kerr);
    expect(subject.check('kind', 7)).toEqual(kerr);
    expect(subject.check('kind', false)).toEqual(kerr);

    expect(subject.check('kind', 0)).toBeUndefined();
    expect(subject.check('kind', 1)).toBeUndefined();
    expect(subject.check('kind', 2)).toBeUndefined();

    subject = new Validator<MockStruct>({
      type: { inclusion: { enum: StringEnum } },
    });
    const terr = { error: 'inclusion', options: { values: ['a', 'b', 'c'] } };

    expect(subject.check('type', undefined)).toBeUndefined();
    expect(subject.check('type', null)).toBeUndefined();
    expect(subject.check('type', '')).toBeUndefined();

    expect(subject.check('type', 'z')).toEqual(terr);
    expect(subject.check('type', '2')).toEqual(terr);
    expect(subject.check('type', 7)).toEqual(terr);
    expect(subject.check('type', false)).toEqual(terr);

    expect(subject.check('type', 'a')).toBeUndefined();
    expect(subject.check('type', 'b')).toBeUndefined();
    expect(subject.check('type', 'c')).toBeUndefined();
  });

  it('should validate format', () => {
    subject = new Validator<MockStruct>({
      title: { format: { pattern: /^[A-Z]\w+$/ } },
    });

    const xerr = { error: 'invalid', options: { details: undefined } };
    expect(subject.check('title', undefined)).toBeUndefined();
    expect(subject.check('title', null)).toBeUndefined();
    expect(subject.check('title', '')).toBeUndefined();

    expect(subject.check('title', 'lower')).toEqual(xerr);
    expect(subject.check('title', 'T')).toEqual(xerr);
    expect(subject.check('title', '3logy')).toEqual(xerr);
    expect(subject.check('title', 7)).toEqual(xerr);
    expect(subject.check('title', false)).toEqual(xerr);

    expect(subject.check('title', 'Title')).toBeUndefined();
    expect(subject.check('title', 'TITLE')).toBeUndefined();
    expect(subject.check('title', 'Me')).toBeUndefined();
  });
});
