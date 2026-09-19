#!/usr/bin/env node
/**
 * dc2jsx — converts the approved `reference/*.dc.html` prototypes into JSX.
 *
 * The prototypes are the client-approved source of truth. Hand-retyping ~1,600
 * lines of densely inline-styled markup would silently drop copy and style
 * declarations, so the port is done mechanically instead:
 *
 *   <sc-if value="{{ x }}">…</sc-if>        →  {x ? (<>…</>) : null}
 *   <sc-for list="{{ xs }}" as="d">…</sc-for> →  {xs.map((d, i) => (<Fragment key={i}>…</Fragment>))}
 *   style="a:b;c:{{ d }}"                    →  style={{ a: 'b', c: d }}
 *   onClick="{{ fn }}"                       →  onClick={fn}
 *   {{ expr }} (in text)                     →  {expr}
 *
 * Identifiers that are not loop variables in scope are read off the view-model
 * object `V` (the port of the prototype's `renderVals()`).
 *
 * Run `npm run fidelity` after regenerating to diff the visible text of the
 * generated components against the reference HTML.
 */

import fs from 'node:fs';

/** Elements that never have a closing tag. */
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

/** HTML attribute name → JSX property name. */
const ATTR_RENAME = {
  class: 'className',
  for: 'htmlFor',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'stop-color': 'stopColor',
  'text-anchor': 'textAnchor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autocomplete: 'autoComplete',
};

/** Attributes carried by the prototype runtime that must not reach the DOM. */
const DROP_ATTRS = new Set(['hint-placeholder-val', 'hint-placeholder-count', 'style-hover']);

/** Attributes whose value is a JS expression, not a string, when interpolated. */
const BOOLEAN_ATTRS = new Set(['checked', 'disabled', 'selected', 'readonly', 'multiple', 'required']);

/**
 * DOM attributes React types as `string`. HTML has no types, so the prototype
 * happily writes `name="{{ t.n }}"` with a number; these are coerced on the way
 * out so the generated code typechecks without changing what renders.
 */
const STRING_ATTRS = new Set([
  'name', 'id', 'href', 'placeholder', 'alt', 'title', 'className', 'htmlFor',
  'target', 'rel', 'role', 'type', 'src', 'aria-label',
]);

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&hellip;': '…',
  '&times;': '×',
  '&check;': '✓',
};

function decodeEntities(s) {
  return s
    .replace(/&[a-zA-Z]+;/g, (m) => (m in ENTITIES ? ENTITIES[m] : m))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

/** kebab-case CSS property → camelCase React style key. */
function cssProp(name) {
  const n = name.trim();
  if (n.startsWith('--')) return `'${n}'`;
  return n.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Rewrites a `{{ … }}` expression body into a JS expression, prefixing free
 * identifiers with the view-model object unless they are loop variables.
 */
function expr(body, scope) {
  const src = body.trim();
  // Literals pass through untouched.
  if (/^(true|false|null|undefined|-?\d+(\.\d+)?|'[^']*'|"[^"]*")$/.test(src)) return src;
  const head = /^[A-Za-z_$][\w$]*/.exec(src);
  if (!head) return src;
  if (scope.includes(head[0])) return src;
  return `V.${src}`;
}

/** Splits text/attribute content into literal and `{{ … }}` parts. */
function parts(raw) {
  const out = [];
  const re = /\{\{([\s\S]*?)\}\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw))) {
    if (m.index > last) out.push({ lit: raw.slice(last, m.index) });
    out.push({ code: m[1] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) out.push({ lit: raw.slice(last) });
  return out;
}

function jsString(s) {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

/** Converts a `style="…"` attribute value into a JSX style object literal. */
function styleObject(raw, scope) {
  const entries = [];
  // Split on ';' that are not inside a {{ }} interpolation.
  const decls = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw.startsWith('{{', i)) { depth++; buf += '{{'; i++; continue; }
    if (raw.startsWith('}}', i)) { depth--; buf += '}}'; i++; continue; }
    if (raw[i] === ';' && depth === 0) { decls.push(buf); buf = ''; continue; }
    buf += raw[i];
  }
  if (buf.trim()) decls.push(buf);

  for (const decl of decls) {
    if (!decl.trim()) continue;
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const name = decl.slice(0, idx);
    const value = decl.slice(idx + 1);
    const ps = parts(decodeEntities(value));
    let js;
    if (ps.length === 1 && ps[0].code !== undefined) {
      js = expr(ps[0].code, scope);
    } else if (ps.every((p) => p.lit !== undefined)) {
      js = jsString(ps.map((p) => p.lit).join('').trim());
    } else {
      // Mixed literal + interpolation, e.g. "2px solid {{ opt.border }}".
      const pieces = ps.map((p) =>
        p.code !== undefined ? '${' + expr(p.code, scope) + '}' : p.lit.replace(/`/g, '\\`').replace(/\$\{/g, '\\${'),
      );
      js = '`' + pieces.join('').trim() + '`';
    }
    entries.push(`${cssProp(name)}: ${js}`);
  }
  return `{{ ${entries.join(', ')} }}`;
}

/** Converts one HTML attribute into its JSX form. Returns null to drop it. */
function attribute(name, raw, scope) {
  if (DROP_ATTRS.has(name)) return null;
  if (name === 'style') return `style=${styleObject(raw, scope)}`;

  const jsxName = ATTR_RENAME[name] || name;
  const ps = parts(decodeEntities(raw));

  // Pure interpolation: emit as an expression.
  if (ps.length === 1 && ps[0].code !== undefined) {
    const code = expr(ps[0].code, scope);
    return `${jsxName}={${STRING_ATTRS.has(name) ? `String(${code})` : code}}`;
  }
  // Pure literal.
  if (ps.every((p) => p.lit !== undefined)) {
    const lit = ps.map((p) => p.lit).join('');
    if (BOOLEAN_ATTRS.has(name) && lit === '') return `${jsxName}`;
    return `${jsxName}=${JSON.stringify(lit)}`;
  }
  // Mixed.
  const pieces = ps.map((p) =>
    p.code !== undefined ? '${' + expr(p.code, scope) + '}' : p.lit.replace(/`/g, '\\`').replace(/\$\{/g, '\\${'),
  );
  return `${jsxName}={\`${pieces.join('')}\`}`;
}

/** Splits a raw tag body (everything after the tag name) into attributes. */
function parseAttrs(src) {
  const attrs = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] !== undefined) attrs.push([m[1], m[2]]);
    else attrs.push([m[3], null]);
  }
  return attrs;
}

/** Escapes a run of text for placement inside JSX. */
function textNode(raw, scope) {
  const ps = parts(raw);
  let out = '';
  for (const p of ps) {
    if (p.code !== undefined) {
      out += `{${expr(p.code, scope)}}`;
    } else {
      // JSX text may not contain { } < > literally.
      out += decodeEntities(p.lit)
        .replace(/([{}<>])/g, (c) => `{${jsString(c)}}`);
    }
  }
  return out;
}

export function convert(html, { scope: initialScope = [] } = {}) {
  let out = '';
  const scope = [...initialScope];
  const openTags = [];
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += textNode(html.slice(i), scope);
      break;
    }
    if (lt > i) out += textNode(html.slice(i, lt), scope);

    // Comment
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      const body = html.slice(lt + 4, end === -1 ? html.length : end).trim();
      out += `{/* ${body.replace(/\*\//g, '* /')} */}`;
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', lt)) {
      const end = html.indexOf('>', lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    // Find the end of the tag, ignoring '>' inside quoted attribute values.
    let j = lt + 1;
    let quote = null;
    while (j < html.length) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') break;
      j++;
    }
    const tagSrc = html.slice(lt + 1, j);
    i = j + 1;

    // Closing tag
    if (tagSrc.startsWith('/')) {
      const name = tagSrc.slice(1).trim().toLowerCase();
      if (name === 'sc-if') {
        out += '</>) : null}';
        openTags.pop();
      } else if (name === 'sc-for') {
        out += '</Fragment>))}';
        scope.pop();
        openTags.pop();
      } else {
        out += `</${name}>`;
        openTags.pop();
      }
      continue;
    }

    const selfClosing = tagSrc.endsWith('/');
    const body = selfClosing ? tagSrc.slice(0, -1) : tagSrc;
    const nameMatch = /^([a-zA-Z][-a-zA-Z0-9]*)/.exec(body);
    if (!nameMatch) continue;
    const name = nameMatch[1].toLowerCase();
    const attrs = parseAttrs(body.slice(nameMatch[0].length));

    if (name === 'sc-if') {
      const cond = attrs.find((a) => a[0] === 'value');
      out += `{${expr(parts(cond[1])[0].code, scope)} ? (<>`;
      openTags.push('sc-if');
      continue;
    }
    if (name === 'sc-for') {
      const list = attrs.find((a) => a[0] === 'list');
      const as = attrs.find((a) => a[0] === 'as');
      const varName = as ? as[1] : 'item';
      out += `{(${expr(parts(list[1])[0].code, scope)} || []).map((${varName}, ${varName}_i) => (<Fragment key={${varName}_i}>`;
      scope.push(varName);
      openTags.push('sc-for');
      continue;
    }

    const rendered = attrs
      .map(([k, v]) => (v === null ? (DROP_ATTRS.has(k) ? null : k) : attribute(k, v, scope)))
      .filter(Boolean)
      .join(' ');

    if (VOID.has(name) || selfClosing) {
      out += `<${name}${rendered ? ' ' + rendered : ''} />`;
    } else {
      out += `<${name}${rendered ? ' ' + rendered : ''}>`;
      openTags.push(name);
    }
  }

  if (openTags.length) {
    throw new Error(`Unbalanced tags remain open: ${openTags.join(', ')}`);
  }
  return out;
}

/** Pulls a `<div data-screen-label="X">…</div>` block (or any labelled block) out of the prototype. */
export function extractScreens(html) {
  const screens = [];
  const re = /<div data-screen-label="([^"]*)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const label = m[1];
    const start = m.index;
    // Walk forward balancing <div> tags.
    let depth = 0;
    let k = start;
    while (k < html.length) {
      const lt = html.indexOf('<', k);
      if (lt === -1) break;
      let j = lt + 1;
      let quote = null;
      while (j < html.length) {
        const c = html[j];
        if (quote) { if (c === quote) quote = null; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '>') break;
        j++;
      }
      const tag = html.slice(lt + 1, j);
      if (/^div\b/i.test(tag) && !tag.endsWith('/')) depth++;
      else if (/^\/div$/i.test(tag.trim())) {
        depth--;
        if (depth === 0) {
          screens.push({ label, html: html.slice(start, j + 1) });
          re.lastIndex = j + 1;
          break;
        }
      }
      k = j + 1;
    }
  }
  return screens;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , file] = process.argv;
  const html = fs.readFileSync(file, 'utf8');
  process.stdout.write(convert(html));
}
