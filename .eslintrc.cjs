module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'camelcase': 'off',
    'no-console': 'off',
    'vue/multi-word-component-names': 'off',

    'no-param-reassign': 'off',
    'no-void': 'off',
    'no-nested-ternary': 'off',
    'max-classes-per-file': 'off',

    'import/first': 'off',
    'import/named': 'error',
    'import/namespace': 'error',
    'import/default': 'error',
    'import/export': 'error',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',

    'prefer-promise-reject-errors': 'off',

    // allow debugger during development only
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

    // Indent with 4 spaces
    "indent": ["error", 4],

    'max-len': ["error", { "code": 200 }]
  },
};
