# Copilot Instructions for FriendlyKobold

## Code Style Preferences

### Comments

- Minimize comments in code - only add them when the code logic is genuinely confusing or complex
- Remove obvious/redundant comments that just describe what the code does
- Prefer self-documenting code with clear variable and function names
- Focus on "why" not "what" when comments are necessary

### General Coding

- Follow existing TypeScript/React patterns in the codebase
- Maintain consistency with the established project structure
- Use proper TypeScript types (avoid `any` when possible)
- Follow the ESLint configuration (includes SonarJS and security rules)
- Never create tests, docs or github workflows
- Stop asking me to run the "dev" script to test changes
- Try to move helper functions from component code to their own separate files to help minimize clutter
