# eslint-plugin-denys-fix-fsd-path-plugin

fsd conception for path

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-denys-fix-fsd-path-plugin`:

```sh
npm install eslint-plugin-denys-fix-fsd-path-plugin --save-dev
```

## Usage

In your [configuration file](https://eslint.org/docs/latest/use/configure/configuration-files#configuration-file), import the plugin `eslint-plugin-denys-fix-fsd-path-plugin` and add `denys-fix-fsd-path-plugin` to the `plugins` key:

```js
import { defineConfig } from "eslint/config";
import denys-fix-fsd-path-plugin from "eslint-plugin-denys-fix-fsd-path-plugin";

export default defineConfig([
    {
        plugins: {
            denys-fix-fsd-path-plugin
        }
    }
]);
```


Then configure the rules you want to use under the `rules` key.

```js
import { defineConfig } from "eslint/config";
import denys-fix-fsd-path-plugin from "eslint-plugin-denys-fix-fsd-path-plugin";

export default defineConfig([
    {
        plugins: {
            denys-fix-fsd-path-plugin
        },
        rules: {
            "denys-fix-fsd-path-plugin/rule-name": "warn"
        }
    }
]);
```



## Configurations

<!-- begin auto-generated configs list -->
TODO: Run eslint-doc-generator to generate the configs list (or delete this section if no configs are offered).
<!-- end auto-generated configs list -->



## Rules

<!-- begin auto-generated rules list -->
TODO: Run eslint-doc-generator to generate the rules list.
<!-- end auto-generated rules list -->
