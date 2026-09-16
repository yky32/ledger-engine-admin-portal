import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  ...coreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Report Prettier diffs (import order, indentation, class order) as
      // editor warnings — otherwise `npm run format:check` failures are
      // invisible until you run it. Excluded from save-time autofix via
      // eslint.codeActionsOnSave.rules so formatting stays manual.
      "prettier/prettier": "warn",
      // New react-hooks v6 rule: flags the fetch-on-mount + setState pattern used by
      // ~20 screens. Replaced wholesale by TanStack Query adoption (planned) — warn
      // until then instead of rewriting data loading in a framework bump.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
