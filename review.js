/**
 * AI Code Review Script
 *
 * Runs in GitHub Actions on pull requests. Fetches changed files and their
 * diffs from the GitHub API, sends the diff to OpenAI for review, and posts
 * the result as a comment on the pull request.
 *
 * Required environment variables:
 *   GITHUB_TOKEN    - GitHub token with repo access
 *   OPENAI_API_KEY  - OpenAI API key
 *   GITHUB_REPOSITORY - "owner/repo" (set automatically in Actions)
 *   PR_NUMBER       - Pull request number (set in the workflow)
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const PR_NUMBER = process.env.PR_NUMBER;

const GITHUB_API_BASE = 'https://api.github.com';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Validate that all required environment variables are present.
 * @throws {Error} If any required variable is missing
 */
function validateEnv() {
  const missing = [];
  if (!GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
  if (!OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!GITHUB_REPOSITORY) missing.push('GITHUB_REPOSITORY');
  if (!PR_NUMBER) missing.push('PR_NUMBER');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Parse "owner/repo" into separate components.
 * @returns {{ owner: string, repo: string }}
 */
function parseRepository() {
  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format: "${GITHUB_REPOSITORY}"`);
  }
  return { owner, repo };
}

/**
 * Make an authenticated request to the GitHub REST API.
 *
 * @param {string} path - API path (e.g. "/repos/owner/repo/pulls/1/files")
 * @param {object} [options] - fetch options (method, body, etc.)
 * @returns {Promise<any>} Parsed JSON response body
 * @throws {Error} On network failure or non-2xx HTTP status
 */
async function githubRequest(path, options = {}) {
  const url = `${GITHUB_API_BASE}${path}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(`GitHub API request failed: ${err.message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }

  // Some endpoints return 204 with no body
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Fetch the list of files changed in the pull request.
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array<{ filename: string, patch?: string, status: string }>>}
 * @throws {Error} On API failure
 */
async function getChangedFiles(owner, repo) {
  const files = await githubRequest(
    `/repos/${owner}/${repo}/pulls/${PR_NUMBER}/files`
  );

  if (!Array.isArray(files)) {
    throw new Error('Unexpected response from GitHub files endpoint');
  }

  return files;
}

/**
 * Build a unified diff string from the changed file list.
 *
 * @param {Array<{ filename: string, patch?: string, status: string }>} files
 * @returns {string} Combined diff text, or empty string if no patches available
 */
function buildDiff(files) {
  return files
    .filter((file) => file.patch)
    .map((file) => `--- ${file.filename} (${file.status})\n${file.patch}`)
    .join('\n\n');
}

/**
 * Send the diff to OpenAI gpt-4o and return a concise code review.
 *
 * @param {string} diff - The pull request diff text
 * @returns {Promise<string>} The AI-generated review comment
 * @throws {Error} On API failure or unexpected response shape
 */
async function getAIReview(diff) {
  const prompt = [
    'You are an expert code reviewer. Review the following pull request diff.',
    'Provide a concise, actionable review covering:',
    '- Bugs and logic errors',
    '- Missing error handling',
    '- Security concerns (especially hardcoded secrets)',
    '- Code quality and readability',
    '',
    'Keep the review under 500 words. Use markdown formatting.',
    '',
    'Diff:',
    diff,
  ].join('\n');

  let response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
  } catch (err) {
    throw new Error(`OpenAI API request failed: ${err.message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Failed to parse OpenAI response: ${err.message}`);
  }

  const review = data?.choices?.[0]?.message?.content;
  if (!review) {
    throw new Error('OpenAI response did not contain a review');
  }

  return review;
}

/**
 * Post a comment on the pull request.
 *
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} body - Markdown comment body
 * @throws {Error} On API failure
 */
async function postReviewComment(owner, repo, body) {
  const commentBody = `## 🤖 AI Code Review\n\n${body}`;

  await githubRequest(`/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: commentBody }),
  });
}

/**
 * Main entry point: fetch diff, run AI review, post comment.
 */
async function main() {
  validateEnv();
  const { owner, repo } = parseRepository();

  console.log(`Reviewing PR #${PR_NUMBER} in ${owner}/${repo}...`);

  const files = await getChangedFiles(owner, repo);
  console.log(`Found ${files.length} changed file(s).`);

  const diff = buildDiff(files);

  if (!diff.trim()) {
    const message =
      'No reviewable diff found (changes may be binary or too large). Skipping AI review.';
    console.log(message);
    await postReviewComment(owner, repo, message);
    return;
  }

  console.log('Sending diff to OpenAI for review...');
  const review = await getAIReview(diff);

  console.log('Posting review comment on PR...');
  await postReviewComment(owner, repo, review);

  console.log('AI code review posted successfully.');
}

main().catch((err) => {
  console.error('Review failed:', err.message);
  process.exit(1);
});
