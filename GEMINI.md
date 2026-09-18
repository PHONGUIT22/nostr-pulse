# Project Instructions & Safety Guardrails

## CRITICAL SAFETY RULES:
1. STRICT WORKSPACE BOUNDARY: You are ONLY allowed to read, create, edit, or delete files strictly within the current working directory (`D:\UIT\NamBonUIT\nostrpulse-full`).
2. NEVER execute commands (bash/powershell) targeting parent directories (`..`), other drives, or system paths.
3. Keep all TypeScript code error-free (`npx tsc --noEmit` must pass with 0 errors).
4. Code comments must be written in English.

## CONTEXT & TOKEN QUOTA GUARDRAILS (CRITICAL):
5. LARGE DATA FILE BAN: NEVER use `Read`, `cat`, `head`, `Get-Content`, or file-viewing tools on generated cache/data files (`src/lib/ring1-cache.json`, `lib/ring1-cache.json`, or any `.json` > 50KB). These contain tens of thousands of lines and will instantly exhaust token context.
6. RUNTIME DATA ACCESS ONLY: When working with large cache files, write runtime code that loads them via `fs.readFileSync`, dynamic `import()`, or stream parsing. If inspecting the schema is necessary, write a quick one-line script (`node -e "..."`) to log only `Object.keys()` or a single sample record.