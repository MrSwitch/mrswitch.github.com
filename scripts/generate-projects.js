#!/usr/bin/env node
/**
 * Generate projects/index.md from the GitHub profile.
 *
 * Lists all repositories the user has created or contributed to,
 * excluding forks. For each project it includes the name, logo (if a
 * custom one is set), description, links, topics (tags), languages and
 * commit/issue stats rendered as unicode bar charts.
 *
 * Usage:
 *   GITHUB_TOKEN=<personal access token> node ./scripts/generate-projects.js
 */

import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Load .env from the project root (if present)
try {
	process.loadEnvFile(join(ROOT, '.env'));
} catch {
	// No .env file — rely on the environment
}

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
	console.error(
		'Missing GITHUB_TOKEN (set it in the environment or a .env file).\n' +
			'Create a token at https://github.com/settings/tokens (scopes: repo, read:user)'
	);
	process.exit(1);
}

const API = 'https://api.github.com/graphql';
const OUT_FILE = join(ROOT, 'projects', 'index.md');

// ---------------------------------------------------------------------------
// GraphQL helpers
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function graphql(query, variables = {}) {
	for (let attempt = 0; ; attempt++) {
		let res;
		try {
			res = await fetch(API, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${TOKEN}`,
					'Content-Type': 'application/json',
					'User-Agent': 'generate-projects-script',
				},
				body: JSON.stringify({query, variables}),
			});
		} catch (err) {
			// Network error — retry
			if (attempt < MAX_RETRIES) {
				const delay = 1000 * 2 ** attempt;
				console.warn(`Request failed (${err.message}), retrying in ${delay}ms…`);
				await sleep(delay);
				continue;
			}
			throw err;
		}

		if (!res.ok) {
			// Retry transient server errors and rate limiting
			if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES) {
				const delay = 1000 * 2 ** attempt;
				console.warn(
					`GitHub API error: ${res.status} ${res.statusText}, retrying in ${delay}ms…`
				);
				await sleep(delay);
				continue;
			}
			throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
		}

		const {data, errors} = await res.json();
		if (errors?.length) {
			throw new Error(errors.map((e) => e.message).join('\n'));
		}
		return data;
	}
}

const REPO_FRAGMENT = `
	fragment RepoFields on Repository {
		name
		nameWithOwner
		description
		url
		homepageUrl
		isFork
		isArchived
		stargazerCount
		openGraphImageUrl
		usesCustomOpenGraphImage
		createdAt
		pushedAt
		owner {
			login
		}
		repositoryTopics(first: 20) {
			nodes {
				topic {
					name
				}
			}
		}
		languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
			totalSize
			edges {
				size
				node {
					name
					color
				}
			}
		}
		defaultBranchRef {
			target {
				... on Commit {
					totalCommits: history {
						totalCount
					}
					myCommits: history(author: {id: $authorId}) {
						totalCount
					}
				}
			}
		}
		issuesCreated: issues(filterBy: {createdBy: $login}) {
			totalCount
		}
		issuesCompleted: issues(filterBy: {createdBy: $login}, states: CLOSED) {
			totalCount
		}
	}
`;

async function getViewer() {
	const data = await graphql(`query { viewer { id login name createdAt } }`);
	return data.viewer;
}

/**
 * Aggregate contribution totals per year since the account was created.
 * Uses contributionsCollection, which reports counts only — private and
 * organisation repositories are included in the totals (restricted count)
 * without their names ever being exposed.
 */
async function fetchYearlyContributions(viewer) {
	const firstYear = new Date(viewer.createdAt).getUTCFullYear();
	const thisYear = new Date().getUTCFullYear();

	const years = [];
	for (let y = firstYear; y <= thisYear; y++) years.push(y);

	// One aliased sub-query per year, batched into a single request
	const query = `
		query {
			viewer {
				${years
					.map(
						(y) => `y${y}: contributionsCollection(
							from: "${y}-01-01T00:00:00Z",
							to: "${y}-12-31T23:59:59Z"
						) {
							totalCommitContributions
							totalIssueContributions
							totalPullRequestContributions
							totalPullRequestReviewContributions
							restrictedContributionsCount
						}`
					)
					.join('\n')}
			}
		}
	`;

	const data = await graphql(query);
	return years.map((year) => {
		const c = data.viewer[`y${year}`];
		return {
			year,
			commits: c.totalCommitContributions,
			issues: c.totalIssueContributions,
			pullRequests: c.totalPullRequestContributions,
			reviews: c.totalPullRequestReviewContributions,
			private: c.restrictedContributionsCount,
		};
	});
}

/**
 * Fetch the number of pull requests the user has opened in each repository.
 * Repository.pullRequests has no author filter, so use the search API,
 * batched with aliases (chunked to keep queries within limits).
 */
async function fetchPullRequestCounts(repos, login) {
	const counts = new Map();
	const CHUNK = 20;

	for (let i = 0; i < repos.length; i += CHUNK) {
		const chunk = repos.slice(i, i + CHUNK);
		const query = `
			query {
				${chunk
					.map(
						(r, j) =>
							`pr${j}: search(query: "repo:${r.nameWithOwner} is:pr author:${login}", type: ISSUE) { issueCount }`
					)
					.join('\n')}
			}
		`;
		const data = await graphql(query);
		chunk.forEach((r, j) => {
			counts.set(r.nameWithOwner, data[`pr${j}`].issueCount);
		});
	}

	return counts;
}

async function paginate(connectionName, affiliationArgs, {id, login}) {
	const results = [];
	let cursor = null;

	const query = `
		query ($authorId: ID!, $login: String!, $cursor: String) {
			viewer {
				${connectionName}(first: 50, after: $cursor${affiliationArgs}) {
					pageInfo {
						hasNextPage
						endCursor
					}
					nodes {
						...RepoFields
					}
				}
			}
		}
		${REPO_FRAGMENT}
	`;

	do {
		const data = await graphql(query, {authorId: id, login, cursor});
		const connection = data.viewer[connectionName];
		results.push(...connection.nodes.filter(Boolean));
		cursor = connection.pageInfo.hasNextPage
			? connection.pageInfo.endCursor
			: null;
	} while (cursor);

	return results;
}

// ---------------------------------------------------------------------------
// Chart rendering
// ---------------------------------------------------------------------------

const BLOCKS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];

/** Render a horizontal bar of `value / max`, `width` characters wide. */
function bar(value, max, width = 20) {
	if (!max) return '';
	const scaled = (value / max) * width;
	const full = Math.floor(scaled);
	const remainder = Math.round((scaled - full) * 8);
	return '█'.repeat(full) + (BLOCKS[remainder] || '');
}

/** Render the language split as a fixed-width stacked unicode bar. */
function languageBar(languages, width = 30) {
	const total = languages.totalSize;
	if (!total) return '';

	const segments = languages.edges.map(({size, node}) => ({
		name: node.name,
		pct: (size / total) * 100,
		chars: Math.max(1, Math.round((size / total) * width)),
	}));

	const barLine = segments
		.map((s, i) => (i % 2 === 0 ? '█' : '░').repeat(s.chars))
		.join('');

	const legend = segments
		.map((s) => `\`${s.name}\` ${s.pct.toFixed(1)}%`)
		.join(' · ');

	return `\`${barLine}\`\n\n${legend}`;
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

/** Format an ISO date as e.g. "Jan 2012". */
function formatMonth(iso) {
	return new Date(iso).toLocaleDateString('en-GB', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

function renderProject(repo, maxCommits, maxIssues) {
	const lines = [];
	const commits = repo.defaultBranchRef?.target?.myCommits?.totalCount ?? 0;
	const pullRequests = repo.myPullRequests ?? 0;
	const issuesCreated = repo.issuesCreated.totalCount;
	const issuesCompleted = repo.issuesCompleted.totalCount;

	lines.push(`## [${repo.name}](${repo.url})`);
	lines.push('');

	// Logo — only when the repository has a custom social/OG image
	if (repo.usesCustomOpenGraphImage && repo.openGraphImageUrl) {
		lines.push(
			`<img src="${repo.openGraphImageUrl}" alt="${repo.name} logo" width="120" align="right" />`
		);
		lines.push('');
	}

	if (repo.description) {
		lines.push(repo.description);
		lines.push('');
	}

	// Start and end dates (created → last push)
	lines.push(`**Active:** ${formatMonth(repo.createdAt)} – ${formatMonth(repo.pushedAt)}`);
	lines.push('');

	// Links
	const links = [`[Repository](${repo.url})`];
	if (repo.homepageUrl) {
		links.push(`[Website](${repo.homepageUrl})`);
	}
	links.push(`[Issues](${repo.url}/issues)`);
	lines.push(`**Links:** ${links.join(' · ')}`);
	lines.push('');

	// Tags
	const topics = repo.repositoryTopics.nodes.map((n) => n.topic.name);
	if (topics.length) {
		lines.push(`**Tags:** ${topics.map((t) => `\`#${t}\``).join(' ')}`);
		lines.push('');
	}

	// Languages
	if (repo.languages.edges.length) {
		lines.push('**Languages:**');
		lines.push('');
		lines.push(languageBar(repo.languages));
		lines.push('');
	}

	// Stats graph
	lines.push('**My contributions:**');
	lines.push('');
	lines.push('| Metric | Count | Graph |');
	lines.push('| --- | ---: | :--- |');
	lines.push(`| Commits | ${commits} | \`${bar(commits, maxCommits)}\` |`);
	lines.push(
		`| Pull requests | ${pullRequests} | \`${bar(pullRequests, maxIssues)}\` |`
	);
	lines.push(
		`| Issues created | ${issuesCreated} | \`${bar(issuesCreated, maxIssues)}\` |`
	);
	lines.push(
		`| Issues completed | ${issuesCompleted} | \`${bar(issuesCompleted, maxIssues)}\` |`
	);
	lines.push('');

	return lines.join('\n');
}

function renderOverviewChart(repos) {
	// Mermaid pie of commits across the top projects
	const top = repos
		.map((r) => ({
			name: r.name,
			commits: r.defaultBranchRef?.target?.myCommits?.totalCount ?? 0,
		}))
		.filter((r) => r.commits > 0)
		.sort((a, b) => b.commits - a.commits)
		.slice(0, 10);

	if (!top.length) return '';

	return [
		'```mermaid',
		'pie showData title Commits by project (top 10)',
		...top.map((r) => `    "${r.name}" : ${r.commits}`),
		'```',
	].join('\n');
}

/**
 * Render aggregated yearly contributions, including private/organisation
 * repositories, as a bar chart — counts only, no repository names.
 */
function renderYearlyContributions(years) {
	const active = years.filter(
		(y) => y.commits + y.issues + y.pullRequests + y.reviews + y.private > 0
	);
	if (!active.length) return '';

	const max = Math.max(
		...active.map((y) => y.commits + y.private),
		1
	);

	const totals = active.reduce(
		(t, y) => ({
			commits: t.commits + y.commits,
			issues: t.issues + y.issues,
			pullRequests: t.pullRequests + y.pullRequests,
			reviews: t.reviews + y.reviews,
			private: t.private + y.private,
		}),
		{commits: 0, issues: 0, pullRequests: 0, reviews: 0, private: 0}
	);

	return [
		'## Contribution history',
		'',
		'All contributions by year — including private and organisation',
		'repositories, aggregated anonymously (`█` public commits, `░` private).',
		'',
		'| Year | Commits | Private | Graph |',
		'| --- | ---: | ---: | :--- |',
		...active
			.slice()
			.reverse()
			.map(
				(y) =>
					`| ${y.year} | ${y.commits} | ${y.private} | \`${bar(y.commits, max, 25)}${bar(y.private, max, 25).replace(/█/g, '░')}\` |`
			),
		'',
		`**All time:** ${totals.commits} public commits · ${totals.private} private contributions · ${totals.pullRequests} pull requests · ${totals.issues} issues · ${totals.reviews} reviews`,
		'',
	].join('\n');
}

function renderMarkdown(viewer, repos, yearlyContributions) {
	const maxCommits = Math.max(
		1,
		...repos.map(
			(r) => r.defaultBranchRef?.target?.myCommits?.totalCount ?? 0
		)
	);
	const maxIssues = Math.max(
		1,
		...repos.map((r) =>
			Math.max(r.issuesCreated.totalCount, r.myPullRequests ?? 0)
		)
	);

	return [
		'---',
		'layout: default',
		'title: Projects',
		'---',
		'',
		'# Projects',
		'',
		`Projects created or contributed to by [@${viewer.login}](https://github.com/${viewer.login}).`,
		'',
		`_Generated on ${new Date().toISOString().slice(0, 10)} — do not edit by hand, run \`npm run projects\`._`,
		'',
		renderYearlyContributions(yearlyContributions),
		'',
		renderOverviewChart(repos),
		'',
		'---',
		'',
		repos.map((r) => renderProject(r, maxCommits, maxIssues)).join('\n---\n\n'),
		'',
	].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const viewer = await getViewer();
console.log(`Fetching repositories for @${viewer.login}…`);

const [yearlyContributions, owned, contributed] = await Promise.all([
	fetchYearlyContributions(viewer),
	// Repositories I own (forks excluded)
	paginate(
		'repositories',
		', ownerAffiliations: OWNER, isFork: false',
		viewer
	),
	// Repositories owned by others that I have contributed to
	paginate(
		'repositoriesContributedTo',
		', contributionTypes: [COMMIT, PULL_REQUEST], includeUserRepositories: false',
		viewer
	),
]);

// De-duplicate and drop any forks that slipped through
const seen = new Set();
const repos = [...owned, ...contributed]
	.filter((r) => !r.isFork)
	// Exclude this site's own repository
	.filter(
		(r) => r.name.toLowerCase() !== `${viewer.login.toLowerCase()}.github.com`
	)
	.filter((r) => !seen.has(r.nameWithOwner) && seen.add(r.nameWithOwner))
	// Most recently active first
	.sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));

console.log(`Found ${repos.length} projects (${owned.length} owned, ${contributed.length} contributed to).`);

// Attach pull request counts
const prCounts = await fetchPullRequestCounts(repos, viewer.login);
for (const repo of repos) {
	repo.myPullRequests = prCounts.get(repo.nameWithOwner) ?? 0;
}

await mkdir(dirname(OUT_FILE), {recursive: true});
await writeFile(OUT_FILE, renderMarkdown(viewer, repos, yearlyContributions));

console.log(`Wrote ${OUT_FILE}`);
