# Copilot Instructions for Gerbil

### General Coding

- Follow existing TypeScript/React patterns in the codebase
- Maintain consistency with the established project structure
- Use proper TypeScript types (avoid `any` when possible)
- Follow the ESLint configuration (includes SonarJS and security rules)
- Never create tests, docs or github workflows
- Stop asking me to run the "dev" script to test changes
- Try to move helper functions from component code to their own separate files to help minimize clutter
- Always use absolute imports (e.g. `import { MyComponent } from '@/components/MyComponent'`)
- Never add explicit return types to functions. We want to rely on implicit types as much as possible

### Logging and Error Handling

- **NEVER use console.\* calls** (console.log, console.error, console.warn, etc.) - they are blocked by ESLint
- **Backend errors**: Use `this.logManager.logError(message, error)` for main process errors
- **Frontend errors**: Use `window.electronAPI.logs.logError(message, error)` for renderer process errors
- All errors are logged asynchronously to avoid blocking the event loop
- Only use console.\* for critical system errors that must appear in terminal (very rare cases)
