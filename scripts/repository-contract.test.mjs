import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseFragment } from "parse5";
import parseSrcset from "parse-srcset";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const projectDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifestPaths = [
  "package.json",
  "packages/core/package.json",
  "packages/cli/package.json",
  "packages/mcp/package.json",
];

const markdownParser = unified().use(remarkParse).use(remarkGfm);

const markdownTargets = (markdown) => {
  const tree = markdownParser.parse(markdown);
  const definitions = new Map();
  walkMarkdown(tree, (node) => {
    if (node.type === "definition" && typeof node.identifier === "string"
      && typeof node.url === "string" && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node.url);
    }
  });

  const targets = [];
  walkMarkdown(tree, (node) => {
    if ((node.type === "link" || node.type === "image") && typeof node.url === "string") {
      targets.push(node.url);
    } else if ((node.type === "linkReference" || node.type === "imageReference")
      && typeof node.identifier === "string") {
      const target = definitions.get(node.identifier);
      if (target !== undefined) targets.push(target);
    } else if (node.type === "html" && typeof node.value === "string") {
      targets.push(...htmlTargets(node.value));
    }
  });
  return targets;
};

const localMarkdownTargets = (markdown) => markdownTargets(markdown)
  .map((rawTarget) => rawTarget.trim())
  .filter((target) => target && !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target))
  .map((target) => decodeURIComponent(target.split("#", 1)[0].split("?", 1)[0]))
  .filter(Boolean);

const htmlTargets = (html) => {
  const targets = [];
  walkHtml(parseFragment(html), (node) => {
    for (const attribute of node.attrs ?? []) {
      if (attribute.name === "href" || attribute.name === "src") {
        targets.push(attribute.value);
      } else if (attribute.name === "srcset") {
        targets.push(...parseSrcset(attribute.value).map((candidate) => candidate.url));
      }
    }
  });
  return targets;
};

const walkMarkdown = (node, visit) => {
  visit(node);
  for (const child of node.children ?? []) walkMarkdown(child, visit);
};

const walkHtml = (node, visit) => {
  visit(node);
  for (const child of node.childNodes ?? []) walkHtml(child, visit);
  if (node.content) walkHtml(node.content, visit);
};

const containsPackedTarget = (files, target) => target === "." || files.has(target)
  || [...files].some((file) => file.startsWith(`${target.replace(/\/$/, "")}/`));

const missingPackedMarkdownTargets = (markdownPath, markdown, files) =>
  localMarkdownTargets(markdown)
    .map((target) => path.posix.normalize(path.posix.join(path.posix.dirname(markdownPath), target)))
    .filter((target) => target === ".." || target.startsWith("../")
      || !containsPackedTarget(files, target));

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

test("Markdown構文解析は参照形式、nested、code、HTML linkとimageを区別する", () => {
  const markdown = [
    "[![nested image][badge]](docs/outer_(v1).md)",
    "[guide][guide-ref]",
    "",
    "[badge]: images/badge.png",
    "[guide-ref]: docs/guide.md",
    "",
    "`[ignored inline](missing-inline.md)`",
    "```md",
    "![ignored fence](missing-fence.png)",
    "```",
    "<a href=\"docs/html.md\"><img src=\"images/direct.png\" srcset=\"images/direct.png 1x, images/direct@2x.png 2x\"></a>",
    "<template><source srcset=\"data:image/svg+xml,%3Csvg%3E 1x, images/template.png 2x\"></template>",
  ].join("\n");

  assert.deepEqual(new Set(localMarkdownTargets(markdown)), new Set([
    "docs/outer_(v1).md",
    "images/badge.png",
    "docs/guide.md",
    "docs/html.md",
    "images/direct.png",
    "images/direct@2x.png",
    "images/template.png",
  ]));
  assert.ok(!markdownTargets(markdown).some((target) => target.startsWith("missing-")));
});

test("参照形式の画像targetがpackに無ければ閉包検査は失敗する", () => {
  const markdown = "![hero][asset]\n\n[asset]: images/missing.png";
  assert.deepEqual(
    missingPackedMarkdownTargets("README.md", markdown, new Set(["README.md"])),
    ["images/missing.png"]
  );
  assert.deepEqual(
    missingPackedMarkdownTargets("README.md", "[package root](.)", new Set(["README.md"])),
    []
  );
});

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
  const productFull = await readFile(
    path.join(projectDirectory, ".github/workflows/product-full-ci.yml"),
    "utf8"
  );
  assert.match(ci, /uses:\s*\.\/\.github\/workflows\/product-full-ci\.yml/);
  assert.doesNotMatch(ci, /kitepon\/dotagents\/.github\/workflows/);
  assert.match(ci, /documentation-command:\s*>-[\s\S]*corepack pnpm install --frozen-lockfile[\s\S]*node --test scripts\/repository-contract\.test\.mjs/);
  assert.match(
    productFull,
    /"macos-native","linux-server","linux-workstation","windows-native"/
  );
  assert.doesNotMatch(`${ci}\n${productFull}`, /linux-native|wsl2/);
  assert.equal((productFull.match(/shell:\s*pwsh/g) ?? []).length, 3);
  assert.doesNotMatch(productFull, /Progra~1\\Git\\bin\\bash\.exe/);
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
      assert.deepEqual(
        missingPackedMarkdownTargets(markdownPath, markdown, files),
        [],
        `${packageDirectory}: ${markdownPath} has a target outside its package`
      );
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
