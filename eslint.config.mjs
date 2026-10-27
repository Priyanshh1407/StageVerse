import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  {
    // PARKED: ticketing is on hold (UPGRADE_PLAN.md, "Parked — Ticketing").
    // These files still have known errors, including BUG-01 (TicketSelection uses icons it
    // never imports and crashes when a tier is selected). They are downgraded to warnings so
    // CI can enforce zero errors elsewhere. Remove this block when ticketing resumes.
    files: [
      "components/fan/TicketSelection.jsx",
      "components/fan/ticket/**",
      "app/(organizer)/ticketing/**",
    ],
    rules: {
      "react/jsx-no-undef": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
