# BSM Validator

Simple validations helper and rules generator, written in TypeScript.

## Usage

Simple validator:

```javascript
import Validator from 'bsm-validator';

const UserValidator = new Validator({
  email: { presence: {}, format: { pattern: /\S+@\S+\.\S+/ } },
  name: { presence: {}, length: { max: 40 } },
  age: { numericality: { greaterThanOrEqualTo: 18 } },
  status: { presence: {}, inclusion: { values: ['active', 'inactive'] }},
});

UserValidator.validate({
  email: 'bad',
  age: 17,
  status: 'none'
});
/*
{
  "email": {"error": "invalid", "options": {}},
  "name": {"error": "presence"},
  "age": {"error": "greaterThanOrEqualTo", "options": {"count": 18}},
  "status": {"error": "inclusion", "options": {"values": ["active", "inactive"]}},
}
*/
```

In Vue/Vuetify:

```html
<template>
  <form>
    <v-text-field label="Email" v-model="email" :rules="rules.email" />
  </form>
</template>

<script>
import Validator from 'bsm-validator';

const CustomValidator = new Validator({
  email: { presence: {}, format: { pattern: /\S+@\S+\.\S+/ } },
});

export default {
  data: () => ({
    rules: CustomValidator.rules,
  }),
}
```
