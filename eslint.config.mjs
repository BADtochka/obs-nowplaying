import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.plasmo/**", "apps/desktop/src-tauri/**", "**/*.vue"],
  },
  tseslint.configs.recommended,
)
