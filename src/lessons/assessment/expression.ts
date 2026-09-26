/**
 * The answer of a numeric question, written as an expression of its drawn
 * parameters (roadmap E03), so a teacher's file can hold a calculation
 * without holding code. Arithmetic only: numbers, the question's parameter
 * names, a few constants, + − × ÷ and ^, parentheses and a short list of
 * functions. Nothing is evaluated as JavaScript.
 */
import { G0, MU_EARTH, R_EARTH } from '../../physics/constants';

export const EXPRESSION_CONSTANTS: Readonly<Record<string, number>> = {
  pi: Math.PI,
  /** standard gravity, m/s² */
  g0: G0,
  /** Earth's gravitational parameter, m³/s² */
  mu: MU_EARTH,
  /** Earth's equatorial radius, m */
  R: R_EARTH,
  /** Earth's sidereal day, s */
  Tsid: 86164.0905,
};

const FUNCTIONS: Readonly<Record<string, (...x: number[]) => number>> = {
  sqrt: Math.sqrt, ln: Math.log, log10: Math.log10, exp: Math.exp, abs: Math.abs,
  sin: (d) => Math.sin(d * Math.PI / 180), cos: (d) => Math.cos(d * Math.PI / 180), tan: (d) => Math.tan(d * Math.PI / 180),
  asin: (x) => Math.asin(x) * 180 / Math.PI, acos: (x) => Math.acos(x) * 180 / Math.PI, atan: (x) => Math.atan(x) * 180 / Math.PI,
  min: Math.min, max: Math.max, cbrt: Math.cbrt,
};

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
    if (num) { out.push({ t: 'num', v: Number(num[0]) }); i += num[0].length; continue; }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    if ('+-*/^(),'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new SyntaxError(`unexpected "${c}"`);
  }
  return out;
}

/** A parsed expression: evaluate it with the parameters' values. */
export type Compiled = (vars: Readonly<Record<string, number>>) => number;

/**
 * Parse an expression. Throws a `SyntaxError` naming what is wrong; `names`
 * are the parameters it may use (anything else must be a constant or a
 * function), so a typo is caught when the file is read, not mid-test.
 */
export function compileExpression(src: string, names: readonly string[]): Compiled {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const isOp = (v: string): boolean => { const k = peek(); return !!k && k.t === 'op' && k.v === v; };
  const expect = (v: string): void => { if (!isOp(v)) throw new SyntaxError(`expected "${v}"`); pos++; };

  // expr := term (('+'|'-') term)* ; term := unary (('*'|'/') unary)* ; unary := '-' unary | power ; power := atom ('^' unary)?
  function expr(): Compiled {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = (tokens[pos++] as { v: string }).v;
      const a = left, b = term();
      left = op === '+' ? (v) => a(v) + b(v) : (v) => a(v) - b(v);
    }
    return left;
  }
  function term(): Compiled {
    let left = unary();
    while (isOp('*') || isOp('/')) {
      const op = (tokens[pos++] as { v: string }).v;
      const a = left, b = unary();
      left = op === '*' ? (v) => a(v) * b(v) : (v) => a(v) / b(v);
    }
    return left;
  }
  function unary(): Compiled {
    if (isOp('-')) { pos++; const a = unary(); return (v) => -a(v); }
    if (isOp('+')) { pos++; return unary(); }
    return power();
  }
  function power(): Compiled {
    const base = atom();
    if (isOp('^')) { pos++; const exp = unary(); return (v) => base(v) ** exp(v); }
    return base;
  }
  function atom(): Compiled {
    const tok = peek();
    if (!tok) throw new SyntaxError('unexpected end');
    if (tok.t === 'num') { pos++; const n = tok.v; return () => n; }
    if (tok.t === 'op' && tok.v === '(') { pos++; const e = expr(); expect(')'); return e; }
    if (tok.t === 'id') {
      pos++;
      const name = tok.v;
      if (isOp('(')) {
        const fn = FUNCTIONS[name];
        if (!fn) throw new SyntaxError(`unknown function "${name}"`);
        pos++;
        const args: Compiled[] = [expr()];
        while (isOp(',')) { pos++; args.push(expr()); }
        expect(')');
        return (v) => fn(...args.map((a) => a(v)));
      }
      if (names.includes(name)) return (v) => v[name];
      if (name in EXPRESSION_CONSTANTS) { const c = EXPRESSION_CONSTANTS[name]; return () => c; }
      throw new SyntaxError(`unknown name "${name}"`);
    }
    throw new SyntaxError(`unexpected "${tok.v}"`);
  }
  const compiled = expr();
  if (pos !== tokens.length) throw new SyntaxError(`unexpected "${(tokens[pos] as { v: unknown }).v}"`);
  return compiled;
}

/** Evaluate once; NaN when the expression cannot be read. */
export function evaluate(src: string, vars: Readonly<Record<string, number>>): number {
  try { return compileExpression(src, Object.keys(vars))(vars); } catch { return NaN; }
}
