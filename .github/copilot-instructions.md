# Copilot Instructions for Gerbil

- **NEVER use console.\* calls** - they are blocked by ESLint. Use `logError()` from `@/utils/node/logging` (main process) or `window.electronAPI.logs.logError()` (renderer)
- Always use absolute imports: `import { X } from '@/components/X'`
- Never add explicit return types to functions - rely on TypeScript inference
- Never create tests, docs, or GitHub workflows
- Move helper functions out of component files into separate utility files
