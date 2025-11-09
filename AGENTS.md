"Priority Rules":
  Description: override default if there is a duplicate
  "Core Principles":
    "Code Usage": Don't write code without using it; ensure everything written is utilized in the project.
    "Readability First": Code must prioritize readability for human understanding over computer execution efficiency. Maintain long-term maintainability over short-term optimization.
    "Data Structures First": Understand and design proper data structures first - good data structures lead to good code.
    Simplicity: Avoid unnecessary complexity - implement simple solutions unless complexity is truly required. Avoid over-engineering - focus on delivering the minimal viable solution.
    "Linus Principles": "New code is garbage if it doesn't follow Linus Torvalds' clean code principles: Keep it simple and obvious; Make code readable like good prose; Avoid premature optimization; Write code that clearly expresses intent; Minimize abstraction layers; Never add functionality 'just in case' - only implement what's needed now; Good taste means knowing when to stop adding features and complexity."
  Comments:
    "Self Documenting First": "Write SELF-DOCUMENTING code with clear variable names, function names, and structure. Code should be readable without comments."
    "When To Comment": "ONLY add comments for: 1) Complex business logic that cannot be simplified, 2) Non-obvious algorithmic decisions, 3) Important 'why' explanations (trade-offs, constraints, workarounds). DO NOT comment on 'how' - the code itself should explain how it works."
    Minimal: "Avoid over-commenting - excessive comments indicate poor code quality. If you need many comments to explain code, refactor the code to be more self-explanatory instead."
    "No Redundant Comments": NEVER write comments that simply restate what the code does. Comments must add information that cannot be expressed in code.
  Workflow:
    "Step 1 Understand": "Before implementation, use provided tools to understand the data structure of the request."
    "Step 2 Testing": Only create automated tests if explicitly required in the original requirements.
    "Step 3 Define Structures": Define all data input/output structures first before writing any logic.
    "Step 4 Define Signatures": Define all function input parameters and return values before implementation.
    "Step 5 Define Functions": Define all required functions and their signatures at once before writing implementation logic.
    "Step 6 Implement": Implementation logic should be written only after all data structures and function definitions are complete.
  "Output Discipline":
    "No Unnecessary Docs": "DO NOT create markdown documentation files, summary files, guide files, or explanation files unless EXPLICITLY requested by the user."
    "Code Focused": Focus only on the code changes requested. Keep responses concise and code-focused.
    "No Readme Spam": "DO NOT generate README.md, GUIDE.md, SUMMARY.md, CHANGELOG.md, INSTRUCTIONS.md, or similar documentation files automatically."
    "No Post Task Summaries": "DO NOT create comprehensive summary documents, completion reports, or documentation files after completing tasks."
    "Functional Files Only": "ONLY create files that are directly required for the functionality being implemented (source code, configuration files, tests if requested)."
    "No Example Files": "DO NOT automatically create example files (example.js, example.ts, demo.*, sample.*, etc.) unless EXPLICITLY requested by the user. Example files are only created when the user specifically asks for examples or demonstrations."
  Linting:
    "Lint Command": ALWAYS run `bun run lint` at root directory after writing code to ensure code quality.
    Linter: "Linter: biome. NEVER run --unsafe, manually fix all errors."
    "Build Requirement": ALWAYS run `bun run build` after linting is complete to ensure code compiles successfully. Fix all build errors before considering the task complete.
    Workflow: "1) Write code, 2) Run `bun run lint` and fix all errors, 3) Run `bun run build` and fix all build errors, 4) Verify success."
  Prisma:
    "Schema Location": The Prisma schema file is located at `prisma/schema.prisma` in the project root.
    "Migration Requirement": "ALWAYS run `bun run prisma:migrate` after ANY modification to the Prisma schema file (prisma/schema.prisma). This is MANDATORY to sync database changes."
    "Migration Workflow": "After editing schema: 1) Save schema changes, 2) Run `bun run prisma:migrate`, 3) Verify migration success before proceeding."
    "Schema Best Practices": "Design database schema following Data Structures First principle. Plan all models, relations, and fields before implementation. Keep schema changes atomic and well-documented in migration names."
