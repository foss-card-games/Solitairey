import babelParser from "@babel/eslint-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("google"), {
    languageOptions: {
        parser: babelParser,
        ecmaVersion: 7,
        sourceType: "script",

        parserOptions: {
            requireConfigFile: false,
        },
    },

    rules: {
        camelcase: "off",
        "comma-dangle": "off",
        indent: "off",
        "no-unused-vars": "off",
        "no-throw-literal": "off",
        "new-cap": "off",
        "max-len": "off",
        "object-curly-spacing": "off",
        "one-var": "off",
        "operator-linebreak": "off",
        "prefer-spread": "off",
        "require-jsdoc": "off",
        "space-before-function-paren": "off",
        "quote-props": "off",
        quotes: "off",
        "valid-jsdoc": "off",
    },
}];
