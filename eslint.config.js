import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // NON-DEVICE FENCE (spec docs/product/EDUCATION-RED-FLAGS-SPEC.md, AC-1).
    // The Education/Safety surface presents GENERIC red-flag information. Its
    // safety case is that it can never read or react to the user's own record,
    // so these files must not import the entries/journal/repository data layer.
    // Keep this list in sync with the education files.
    files: [
      "src/lib/bumpnotes/education-content.ts",
      "src/components/bumpnotes/EducationSection.tsx",
      "src/routes/safety.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/data",
                "@/lib/data/*",
                "@/lib/domain/*",
                "@/lib/bumpnotes/store",
                "**/data/repository*",
                "**/data/hooks*",
                "**/data/api-repo*",
                "**/data/local-repo*",
                "**/data/capture*",
                "**/entry-adapter*",
              ],
              message:
                "Education is NON-device (AC-1): it must not import the journal/entries/repository data layer, so it can never read or react to the user's own record. See docs/product/EDUCATION-RED-FLAGS-SPEC.md.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
