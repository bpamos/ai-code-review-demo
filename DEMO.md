# Demo Scenarios

This guide walks through three scenarios that showcase the PR pipeline: GitLeaks catching secrets, the AI reviewer catching bugs, and a clean PR passing all checks.

For each scenario, create a new branch from `main`, make the described changes, open a pull request targeting `main`, and watch the pipeline run in the **Actions** tab.

---

## Scenario A: GitLeaks catches a hardcoded secret

**Goal:** Show that the pipeline fails when a secret is committed, then passes after the fix.

### Step 1 — Introduce a fake hardcoded API key

On a new branch (e.g. `demo/gitleaks-failure`), add a **single-line** fake key to `src/api.js` (after `let nextId = 1;`):

```javascript
// Temporary demo key — DO NOT commit real secrets (fake value for demo only)
const DEMO_API_KEY = 'sk-proj-Xk9mN2pQ7rT4vW8yZ1aB3cD5eF6gH7iJ8kL9mN0oP1qR2sT3uV4wX5yZ6aB7cD8eF9gH0iJ1kL2mN3oP4q';
```

Keep the assignment on **one line** and export `DEMO_API_KEY` from `module.exports` so ESLint passes.

Push the branch and open a PR to `main`.

### Step 2 — Observe the failure

In the **Actions** tab, the **GitLeaks** job fails. The **All Checks Passed** job is skipped because it depends on GitLeaks succeeding. The PR cannot merge until the check passes.

### Step 3 — Fix the secret

Remove the hardcoded key and read credentials from the environment instead:

```javascript
/**
 * Demo API key loaded from environment (never hardcode secrets).
 * Set DEMO_API_KEY in local .env for development.
 */
const apiKey = process.env.DEMO_API_KEY;
```

Export `apiKey` from `module.exports` (replace `DEMO_API_KEY`). Add `DEMO_API_KEY` to your local `.env` file for development (never commit `.env`).

Push the fix to the same branch. GitLeaks scans the updated file contents and passes; the rest of the pipeline runs.

---

## Scenario B: AI reviewer catches a buggy function

**Goal:** Show the AI code review job posting feedback about missing error handling and logic bugs.

### Step 1 — Add a deliberately buggy function

On a new branch (e.g. `demo/ai-review-bug`), add this function to `src/api.js`:

```javascript
/**
 * Divide two numbers — intentionally missing error handling for demo purposes.
 */
function divide(a, b) {
  return a / b;
}

module.exports = { addTodo, getAllTodos, deleteTodo, resetTodos, divide };
```

Push and open a PR to `main`.

### Step 2 — Observe the AI review comment

Wait for the **AI Code Review** job to finish. On the PR **Conversation** tab, find the comment starting with **🤖 AI Code Review**. It should flag:

- Division by zero (no guard for `b === 0`)
- Missing input validation (non-number arguments)
- Missing error handling

### Step 3 — Fix the issues (optional)

Add validation and error handling, push again, and note how the AI review changes on the updated diff.

---

## Scenario C: Clean code passes all checks

**Goal:** Show a well-written change passing every job with positive AI feedback.

### Step 1 — Add a clean, well-documented function

On a new branch (e.g. `demo/clean-code`), add this to `src/api.js`:

```javascript
/**
 * Mark a todo item as completed by id.
 *
 * @param {number} id - The id of the todo to complete
 * @returns {{ id: number, text: string, completed: boolean }} The updated todo
 * @throws {Error} If id is invalid or the todo is not found
 */
function completeTodo(id) {
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new Error('Todo id must be a positive integer');
  }

  const todo = todos.find((item) => item.id === id);
  if (!todo) {
    throw new Error(`Todo with id ${id} not found`);
  }

  todo.completed = true;
  return { ...todo };
}
```

Export `completeTodo` from the module and add matching tests in `tests/api.test.js`.

Push and open a PR to `main`.

### Step 2 — Verify all jobs pass

Confirm all four jobs succeed:

| Job | Expected result |
|-----|-----------------|
| ESLint | Pass |
| GitLeaks | Pass |
| AI Code Review | Pass — posts a positive or constructive comment |
| All Checks Passed | Pass |

The PR is merge-ready once branch protection requires the **All Checks Passed** job.

---

## Tips

- Run `npm test` and `npm run lint` locally before pushing to catch issues early.
- GitLeaks scans **changed files at PR head**, not diff fragments — use a high-entropy fake key on one line so it matches on the first push.
- AI review comments vary slightly between runs; focus on whether real issues are identified.
- Configure branch protection on `main` to require the **All Checks Passed** status check for merge enforcement.
