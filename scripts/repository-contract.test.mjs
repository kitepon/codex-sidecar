import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifestPaths = [
  "package.json",
  "packages/core/package.json",
  "packages/cli/package.json",
  "packages/mcp/package.json",
];

const localMarkdownTargets = (markdown) => [...markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)]
  .map((match) => match[1].trim().replace(/^<|>$/g, ""))
  .filter((target) => target && !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target))
  .map((target) => decodeURIComponent(target.split("#", 1)[0].split("?", 1)[0]))
  .filter(Boolean);

const markdownFiles = async (directory, prefix = "") => {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "dist", "node_modules", "rag"].includes(entry.name)) continue;
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await markdownFiles(absolute, relative));
    else if (/\.md$/i.test(entry.name)) found.push(relative);
  }
  return found;
};

test("公開packageはversionとNode最低版を一意に共有する", async () => {
  const manifests = await Promise.all(manifestPaths.map(async (relativePath) =>
    JSON.parse(await readFile(path.join(projectDirectory, relativePath), "utf8"))
  ));
  const [root, core, cli, mcp] = manifests;
  for (const manifest of manifests) {
    assert.equal(manifest.version, root.version);
    assert.equal(manifest.engines.node, ">=22.13.0");
  }
  assert.equal(cli.dependencies[core.name], `workspace:${root.version}`);
  assert.equal(mcp.dependencies[core.name], `workspace:${root.version}`);

  const lockfile = await readFile(path.join(projectDirectory, "pnpm-lock.yaml"), "utf8");
  const workspaceSpecifierCount = lockfile.split(`specifier: workspace:${root.version}`).length - 1;
  assert.equal(workspaceSpecifierCount, 2, "CLI/MCP lockfile specifier must match the release version");
});

test("CIは製品所有のlocal reusable workflowだけを呼ぶ", async () => {
  const ci = await readFile(path.join(projectDirectory, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /uses:\s*\.\/\.github\/workflows\/product-full-ci\.yml/);
  assert.doesNotMatch(ci, /kitepon\/dotagents\/.github\/workflows/);
  assert.match(ci, /documentation-command:\s*node --test scripts\/repository-contract\.test\.mjs/);
  await access(path.join(projectDirectory, ".github/workflows/product-full-ci.yml"));
});

test("repository内のMarkdownはローカルリンク切れを持たない", async () => {
  const missing = [];
  for (const markdownPath of await markdownFiles(projectDirectory)) {
    const markdown = await readFile(path.join(projectDirectory, markdownPath), "utf8");
    for (const target of localMarkdownTargets(markdown)) {
      const absolute = path.resolve(projectDirectory, path.dirname(markdownPath), target);
      try {
        await stat(absolute);
      } catch {
        missing.push(`${markdownPath} -> ${target}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

test("公開packageは自己完結したREADMEを同梱する", async () => {
  for (const packageDirectory of ["packages/core", "packages/cli", "packages/mcp"]) {
    const packed = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], {
      cwd: path.join(projectDirectory, packageDirectory),
      encoding: "utf8",
    }))[0];
    const files = new Set(packed.files.map((entry) => entry.path));
    assert.ok(files.has("README.md"), `${packageDirectory} must ship README.md`);
    for (const markdownPath of [...files].filter((file) => /\.md$/i.test(file))) {
      const markdown = await readFile(path.join(projectDirectory, packageDirectory, markdownPath), "utf8");
      for (const target of localMarkdownTargets(markdown)) {
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(markdownPath), target));
        assert.ok(files.has(resolved), `${packageDirectory}: ${markdownPath} -> ${target}`);
      }
    }
  }
});

test("CIの外部actionはimmutable commitへ固定する", async () => {
  const workflowDirectory = path.join(projectDirectory, ".github/workflows");
  const workflowNames = (await readdir(workflowDirectory))
    .filter((name) => /\.ya?ml$/.test(name));
  for (const workflowName of workflowNames) {
    const workflow = await readFile(path.join(workflowDirectory, workflowName), "utf8");
    for (const match of workflow.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)) {
      const action = match[1];
      if (action.startsWith("./")) {
        continue;
      }
      assert.match(
        action,
        /^[^@\s]+@[0-9a-f]{40}$/i,
        `${workflowName}: external action must use an immutable 40-hex commit: ${action}`
      );
    }
  }
});
