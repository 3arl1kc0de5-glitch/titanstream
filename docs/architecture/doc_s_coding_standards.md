# Document S: Coding Standards

This document establishes the code quality rules, TypeScript constraints, testing expectations, and repository conventions for the TitanStream team.

---

## 1. Naming Conventions

To maintain a uniform codebase across the monorepo:

* **File Naming:**
  * React Components: PascalCase (e.g., `MiningSpinner.tsx`, `WithdrawalForm.tsx`).
  * Hooks: camelCase starting with `use` (e.g., `useMiningTicker.ts`).
  * NestJS Modules/Controllers/Services: kebab-case (e.g., `mining-session.controller.ts`).
* **Variables & Functions:**
  * Use standard `camelCase` for variables, properties, and functions (e.g., `currentMultiplier`, `calculateYield()`).
* **Interfaces & Types:**
  * Use PascalCase. Interface names must **not** be prefixed with `I` (except in specific design pattern layouts like adapters: `TonAdapter` implements `IBlockchainAdapter` to indicate contract).
* **Database Models & Enums:**
  * Prisma models use PascalCase. Columns, constraints, and tables use `snake_case`.

---

## 2. TypeScript & Linting Constraints

The root `tsconfig.json` enforces strict compiler checks:

* **`strict: true`:** Required app-wide.
* **`noImplicitAny: true`:** Declaring variables or parameters without explicit types is blocked.
* **Type Assertions:** Avoid `as any` type-casting. If conversion is necessary, use intermediate typing or write validation assertions.
* **Optional Chaining:** Prefer optional chaining (`user?.wallet?.balance`) over compound logical statements (`user && user.wallet && user.wallet.balance`).

---

## 3. React Component Standards

* **Functional Components:** All components must use functional definitions with Arrow functions and explicitly type props:
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled} className="px-4 py-2 bg-green-500 rounded">
      {label}
    </button>
  );
};
```
* **Logic Separation:** Keep components focused on UI. Place complex state, polling loops, or ledger conversions inside custom hooks (e.g., `useMiningTicker`).

---

## 4. API Standards

* **RESTful Paths:** Use nouns for collection names (e.g., `/api/v1/quests`, `/api/v1/withdrawals`).
* **HTTP Verbs:** Use correct method contexts:
  * `GET` for reads.
  * `POST` for creations or custom actions (like `/toggle`, `/tap`).
  * `PATCH`/`PUT` for updates.
  * `DELETE` for removals.
* **Response Wrapper:** Every API response must use the standard envelope: `{ success: true, data: { ... } }`.

---

## 5. Commit & Git Message Guidelines

The repository enforces **Conventional Commits** via git hooks:

* **Format:** `<type>(<scope>): <description>`
* **Types:**
  * `feat`: A new feature implementation.
  * `fix`: A bug fix.
  * `docs`: Documentation updates.
  * `style`: Styling changes, formatting (no code changes).
  * `refactor`: Restructuring code (no feature or bug fixes).
  * `test`: Adding or correcting tests.
  * `chore`: Package updates, configuration changes.
* **Example:** `feat(mining): implement server-side cooling multiplier tap validation`
