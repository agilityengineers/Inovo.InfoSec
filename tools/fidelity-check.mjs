#!/usr/bin/env node
/**
 * Verifies that the generated screen components still carry the approved
 * prototypes' visible copy, inline styles and element structure, byte for byte.
 *
 *   npm run fidelity
 *
 * Three comparisons run per screen:
 *   1. visible text   — every literal string a visitor can read
 *   2. style decls    — every inline CSS declaration, in order
 *   3. element tags   — the sequence of opened elements
 *
 * Any difference is a bug: the prototypes are client-approved and the brief is
 * to reproduce them exactly. Exits non-zero on the first mismatch.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCREENS = [
  { file: 'MSP Assessment.dc.html', from: 41, to: 322, name: 'MspLanding' },
  { file: 'MSP Assessment.dc.html', from: 327, to: 523, name: 'MspAssessment' },
  { file: 'MSP Assessment.dc.html', from: 528, to: 694, name: 'MspAdmin' },
  { file: 'MSP Assessment.dc.html', from: 699, to: 749, name: 'MspNotes' },
  { file: 'Client Assessment.dc.html', from: 43, to: 360, name: 'ClientPage' },
  { file: 'Client Assessment.dc.html', from: 365, to: 431, name: 'ClientAdmin' },
];

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' };
const decode = (s) =>
  s.replace(/&[a-zA-Z]+;/g, (m) => ENTITIES[m] ?? m).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

const norm = (s) => s.replace(/\s+/g, ' ').trim();

/** Stand-ins for literal angle brackets/braces that appear in the approved copy. */
const SENTINEL = { '<': '\u0001', '>': '\u0002', '{': '\u0003', '}': '\u0004' };
const UNSENTINEL = { '\u0001': '<', '\u0002': '>', '\u0003': '{', '\u0004': '}' };

/** Visible text of the reference block: tags, comments and {{ }} removed. */
function referenceText(html) {
  return norm(
    decode(
      html
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\{\{[\s\S]*?\}\}/g, ' '),
    ),
  );
}

/**
 * Visible text of the generated component.
 *
 * A regex cannot do this: literal copy lives in JSX child position, which may
 * sit inside an expression container (`{cond ? (<>copy</>) : null}`), so the
 * scanner tracks whether it is reading JSX children or JavaScript.
 */
function generatedText(tsx) {
  const start = tsx.indexOf('return (');
  const src = tsx
    .slice(start + 'return ('.length, tsx.lastIndexOf(');'))
    // The generator escapes bare braces/angles as {'<'}. Map them to sentinels
    // rather than real characters, so literal copy like `msp_domain_<id>_pct`
    // is not mistaken for markup by the scanner below.
    .replace(/\{'([<>{}])'\}/g, (_, c) => SENTINEL[c])
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

  const out = [];
  const n = src.length;
  let i = 0;

  /** Consumes `<…>` starting at src[i]; returns how it changes element depth. */
  function readTag() {
    i++; // '<'
    const closing = src[i] === '/';
    if (closing) i++;
    let quote = null;
    let braces = 0;
    let selfClosing = false;
    while (i < n) {
      const c = src[i];
      if (quote) {
        if (c === quote && src[i - 1] !== '\\') quote = null;
      } else if (c === '"' || c === "'" || c === '`') {
        quote = c;
      } else if (c === '{') {
        braces++;
      } else if (c === '}') {
        braces--;
      } else if (c === '/' && braces === 0 && src[i + 1] === '>') {
        selfClosing = true;
      } else if (c === '>' && braces === 0) {
        i++;
        return closing ? -1 : selfClosing ? 0 : 1;
      }
      i++;
    }
    return 0;
  }

  /** Reads JSX children, collecting literal text, until `depth` returns to 0. */
  function jsxMode(depth) {
    while (i < n) {
      const c = src[i];
      if (c === '<') {
        depth += readTag();
        out.push(' '); // tags separate words, as in the reference extractor
        if (depth <= 0) return;
        continue;
      }
      if (c === '{') {
        i++;
        exprMode();
        out.push(' '); // an interpolation separates words, as `{{ … }}` does
        continue;
      }
      out.push(c);
      i++;
    }
  }

  /** Reads a JavaScript expression container, collecting only nested JSX text. */
  function exprMode() {
    let quote = null;
    while (i < n) {
      const c = src[i];
      if (quote) {
        if (c === quote && src[i - 1] !== '\\') quote = null;
        i++;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { quote = c; i++; continue; }
      if (c === '}') { i++; return; }
      if (c === '<') {
        const delta = readTag();
        out.push(' ');
        if (delta > 0) jsxMode(1);
        continue;
      }
      i++;
    }
  }

  jsxMode(1);
  return norm(out.join('').replace(/[\u0001-\u0004]/g, (c) => UNSENTINEL[c]));
}

/** Every inline CSS declaration in source order, with interpolations masked. */
function referenceStyles(html) {
  const out = [];
  for (const m of html.matchAll(/style="([^"]*)"/g)) {
    for (const decl of m[1].split(/;(?![^{]*\}\})/)) {
      const d = norm(decode(decl)).replace(/\{\{[\s\S]*?\}\}/g, '~');
      if (d) out.push(d.replace(/\s*:\s*/, ':'));
    }
  }
  return out;
}

function generatedStyles(tsx) {
  const out = [];
  for (const m of tsx.matchAll(/style=\{\{([\s\S]*?)\}\}(?=[\s/>])/g)) {
    for (const decl of splitTop(m[1])) {
      const idx = decl.indexOf(':');
      if (idx === -1) continue;
      let name = decl.slice(0, idx).trim().replace(/^'|'$/g, '');
      name = name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
      let value = decl.slice(idx + 1).trim();
      if (/^'.*'$/.test(value)) value = value.slice(1, -1);
      else if (/^`.*`$/.test(value)) value = value.slice(1, -1).replace(/\$\{[^}]*\}/g, '~');
      else value = '~';
      out.push(`${name}:${norm(value)}`);
    }
  }
  return out;
}

/** Splits an object literal body on top-level commas. */
function splitTop(src) {
  const out = [];
  let depth = 0;
  let buf = '';
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      buf += c;
      if (c === quote && src[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === "'" || c === '`' || c === '"') { quote = c; buf += c; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    if (c === '}' || c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

const SKIP_TAGS = new Set(['sc-if', 'sc-for', 'fragment']);

function tagSequence(src, isJsx) {
  const out = [];
  for (const m of src.matchAll(/<\/?([a-zA-Z][-a-zA-Z0-9]*)/g)) {
    const name = m[1].toLowerCase();
    if (SKIP_TAGS.has(name)) continue;
    out.push((m[0][1] === '/' ? '/' : '') + name);
  }
  if (isJsx) return out;
  return out;
}

function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return { i, a: a[i], b: b[i] };
  }
  return null;
}

let failures = 0;
for (const screen of SCREENS) {
  const html = fs
    .readFileSync(path.join(root, 'reference', screen.file), 'utf8')
    .split('\n')
    .slice(screen.from - 1, screen.to)
    .join('\n');
  const tsxPath = path.join(root, 'components', 'generated', `${screen.name}.tsx`);
  if (!fs.existsSync(tsxPath)) {
    console.error(`  MISSING  ${screen.name}: run \`npm run generate:screens\``);
    failures++;
    continue;
  }
  const tsx = fs.readFileSync(tsxPath, 'utf8');

  const problems = [];

  const refText = referenceText(html);
  const genText = generatedText(tsx);
  if (refText !== genText) {
    const a = refText.split(' ');
    const b = genText.split(' ');
    const d = firstDiff(a, b);
    problems.push(
      `text differs at word ${d?.i}\n      reference: …${a.slice(Math.max(0, d.i - 6), d.i + 6).join(' ')}…\n      generated: …${b.slice(Math.max(0, d.i - 6), d.i + 6).join(' ')}…`,
    );
  }

  const refStyles = referenceStyles(html);
  const genStyles = generatedStyles(tsx);
  if (refStyles.length !== genStyles.length || refStyles.some((s, i) => s !== genStyles[i])) {
    const d = firstDiff(refStyles, genStyles);
    problems.push(
      `style declarations differ (${refStyles.length} reference vs ${genStyles.length} generated) at #${d?.i}\n      reference: ${d?.a}\n      generated: ${d?.b}`,
    );
  }

  const refTags = tagSequence(html.replace(/<!--[\s\S]*?-->/g, ''), false);
  const genTags = tagSequence(tsx.slice(tsx.indexOf('return (')).replace(/\{\/\*[\s\S]*?\*\/\}/g, ''), true);
  if (refTags.length !== genTags.length || refTags.some((t, i) => t !== genTags[i])) {
    const d = firstDiff(refTags, genTags);
    problems.push(
      `element sequence differs (${refTags.length} reference vs ${genTags.length} generated) at #${d?.i}\n      reference: ${d?.a}\n      generated: ${d?.b}`,
    );
  }

  if (problems.length) {
    failures++;
    console.error(`  FAIL  ${screen.name}`);
    for (const p of problems) console.error(`      ${p}`);
  } else {
    console.log(`  ok    ${screen.name}  (${refText.split(' ').length} words, ${refStyles.length} style decls, ${refTags.length} elements)`);
  }
}

if (failures) {
  console.error(`\n${failures} screen(s) drifted from the approved prototypes.`);
  process.exit(1);
}
console.log('\nAll screens match the approved prototypes.');
