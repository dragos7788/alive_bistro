# >>> genai-dev-toolkit >>>
---
applyTo: '**'
description: "General development best practices and workflow guidance"
---
# General Development Best Practices
## AI Behavior Summary
- Prefer clear, correct, minimal solutions over clever or complex ones.
- Keep changes small and focused, matching the existing style and patterns.
- When adding or changing non-trivial logic, also suggest or generate appropriate tests.
- Surface obvious security or performance issues you notice in the code you touch.
## Workflow
### Before Writing Code
1. Understand requirements fully
2. Design/plan the solution
3. Consider edge cases and failure modes
### During Development
1. Write failing tests first (TDD preferred)
2. Implement minimal code to pass tests
3. Refactor for clarity
4. Update documentation
### Before Committing
1. Run all tests locally
2. Fix linting/formatting issues
3. Review your own changes
4. Write descriptive commit message
## Related Custom Instructions
- **Standards (detailed rules)**: Auto-loaded from `instructions/standards/`
- **Language-specific**: See `instructions/tech/{lang}-copilot.instructions.md`
- **Project-specific**: See `instructions/project/project-base.instructions.md`
- **Personal**: See `instructions/personal/personal-preferences.instructions.md`
- **Skills (on-demand)**: See `skills/SKILLS-MAP.md` for the knowledge base index
# <<< genai-dev-toolkit <<<
