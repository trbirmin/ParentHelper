// Minimal math solver: parses simple arithmetic expressions and returns steps
// Supports +, -, *, /, ^, parentheses, and common symbols/words (× x ÷ plus minus times divided by)
// Extras: lightweight unit conversion (length/weight/time) and linear equation solver ax + b = c

function stripBulletPrefix(s = '') {
  // Remove common bullets/enumerations: •, -, 1. , a) , (1) , etc., and stray leading dots/colons
  return String(s)
    .replace(/^\s*[•·▪◦\-–—]\s+/, '')
    .replace(/^\s*\(?\d+[).]\s+/, '')
    .replace(/^\s*\(?[A-Za-z][).]\s+/, '')
    .replace(/^\s*[\.\:]+\s+/, '')
}

function normalizeMath(text = '') {
  let t = stripBulletPrefix(String(text))
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ') // nbsp -> space
  .replace(/[\[\{]/g, '(')
  .replace(/[\]\}]/g, ')')
    .replace(/\u00D7|\u2715|\u22C5|x|X/g, '*') // ×, ✕, ⋅, x
    .replace(/\u00F7/g, '/') // ÷
    .replace(/[–—]/g, '-') // en/em dashes
    .replace(/\bover\b/gi, '/')
    .replace(/\bplus\b/gi, '+')
    .replace(/\bminus\b/gi, '-')
    .replace(/\btimes\b|\bmultiplied\s+by\b/gi, '*')
    .replace(/\bdivided\s+by\b/gi, '/')
    .replace(/\s+=\s*\?*/g, '') // drop trailing = or = ?
    .replace(/(\d),(?=\d{3}(\D|$))/g, '$1') // remove thousands commas conservatively
  // convert mixed numbers like 1 2/3 -> 1+(2/3)
  .replace(/(\b\d+)\s+(\d+)\s*\/\s*(\d+)\b/g, '($1+($2/$3))')
    .trim()
  return t
}

function extractCandidateLine(text = '') {
  const lines = String(text).split(/\n+/)
  // Prefer the shortest line that contains at least one operator and a digit
  const scored = lines
    .map(l => stripBulletPrefix(l.trim()))
    .filter(l => /\d/.test(l) && /[+\-*/^()x×÷]/i.test(l))
    .sort((a, b) => a.length - b.length)
  return scored[0] || stripBulletPrefix(lines[0] || '')
}

function tokenize(expr) {
  const tokens = []
  const s = expr.trim()
  const re = /\s*([0-9]*\.?[0-9]+|\(|\)|\+|\-|\*|\/|\^)\s*/y
  let i = 0
  while (i < s.length) {
    re.lastIndex = i
    const m = re.exec(s)
    if (!m) {
      // Unknown char; bail out
      throw new Error(`Unexpected token near: "${s.slice(i, Math.min(i + 8, s.length))}"`)
    }
    tokens.push(m[1])
    i = re.lastIndex
  }
  return tokens
}

function toRPN(tokens) {
  // Shunting-yard
  const out = []
  const ops = []
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 }
  const rightAssoc = { '^': true }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (/^\d/.test(t)) {
      out.push(parseFloat(t))
      continue
    }
    if (t === '(') { ops.push(t); continue }
    if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop())
      if (!ops.length) throw new Error('Mismatched parentheses')
      ops.pop()
      continue
    }
    // Handle unary minus by converting to 0 - x
    if ((t === '+' || t === '-') && (i === 0 || (tokens[i - 1] && /[+\-*/^\(]/.test(tokens[i - 1])))) {
      out.push(0)
    }
    while (
      ops.length && ops[ops.length - 1] !== '(' &&
      (prec[ops[ops.length - 1]] > prec[t] || (prec[ops[ops.length - 1]] === prec[t] && !rightAssoc[t]))
    ) {
      out.push(ops.pop())
    }
    ops.push(t)
  }
  while (ops.length) {
    const op = ops.pop()
    if (op === '(') throw new Error('Mismatched parentheses')
    out.push(op)
  }
  return out
}

function evalRPN(rpn) {
  const stack = []
  const steps = []
  for (const t of rpn) {
    if (typeof t === 'number') { stack.push(t); continue }
    const b = stack.pop(); const a = stack.pop()
    if (a === undefined || b === undefined) throw new Error('Invalid expression')
    let v
    switch (t) {
      case '+': v = a + b; break
      case '-': v = a - b; break
      case '*': v = a * b; break
      case '/': v = b === 0 ? NaN : a / b; break
      case '^': v = Math.pow(a, b); break
      default: throw new Error(`Unknown operator ${t}`)
    }
    steps.push(`${a} ${t} ${b} = ${v}`)
    stack.push(v)
  }
  if (stack.length !== 1) throw new Error('Invalid expression')
  return { result: stack[0], steps }
}

export function solveFromText(text) {
  const candidate = extractCandidateLine(text)
  const normalized = normalizeMath(candidate)
  // Try equation solve first: ax + b = c (x on one side)
  const eq = normalized.match(/^\s*([-+]?\d*\.?\d*)\s*\*?\s*x\s*([+\-]\s*\d*\.?\d+)?\s*=\s*([-+]?\d*\.?\d+)\s*$/i)
  if (eq) {
    const a = eq[1] === '' || eq[1] === '+' || eq[1] === undefined ? 1 : (eq[1] === '-' ? -1 : parseFloat(eq[1]))
    const b = eq[2] ? parseFloat(eq[2].replace(/\s+/g,'')) : 0
    const c = parseFloat(eq[3])
    const steps = [`${a}x ${b>=0?'+':'-'} ${Math.abs(b)} = ${c}`, `${a}x = ${c - b}`, `x = ${(c - b) / a}`]
    return { success: true, expression: normalized, result: (c - b) / a, steps }
  }
  // Unit conversion like "5 km to m" or "12 in to cm"
  const uc = normalized.match(/^(\d*\.?\d+)\s*([a-zA-Z]+)\s+(?:to|in)\s+([a-zA-Z]+)$/)
  if (uc) {
    const value = parseFloat(uc[1]); const fromU = uc[2].toLowerCase(); const toU = uc[3].toLowerCase()
    const conv = unitConvert(value, fromU, toU)
    if (conv.ok) {
      return { success: true, expression: normalized, result: conv.value, steps: conv.steps }
    }
  }
  // Accept only characters in our grammar
  if (!/^[0-9+\-*/^().\s]+$/.test(normalized)) {
    return { success: false, reason: 'No clean arithmetic expression found', candidate, normalized }
  }
  try {
    const tokens = tokenize(normalized)
    const rpn = toRPN(tokens)
    const { result, steps } = evalRPN(rpn)
    return { success: true, expression: normalized, result, steps }
  } catch (e) {
    return { success: false, reason: 'parse-error', error: e?.message, candidate, normalized }
  }
}

export function solveExpression(expression) {
  const normalized = normalizeMath(expression)
  const tokens = tokenize(normalized)
  const rpn = toRPN(tokens)
  const { result, steps } = evalRPN(rpn)
  return { expression: normalized, result, steps }
}

// Very small unit conversion table (extend as needed)
const UNIT_TABLE = {
  // length
  m: { m:1, cm:100, mm:1000, km:0.001, in:39.3700787, ft:3.2808399, yd:1.0936133, mi:0.000621371 },
  cm: { m:0.01 }, mm: { m:0.001 }, km: { m:1000 },
  in: { m:0.0254 }, ft: { m:0.3048 }, yd: { m:0.9144 }, mi: { m:1609.344 },
  // mass
  g: { g:1, kg:0.001, mg:1000, lb:0.0022046226, oz:0.0352739619 },
  kg: { g:1000 }, mg: { g:0.001 }, lb: { g:453.59237 }, oz: { g:28.349523125 },
  // time
  s: { s:1, ms:1000, min:1/60, h:1/3600, hr:1/3600 },
  ms: { s:0.001 }, min: { s:60 }, h: { s:3600 }, hr: { s:3600 }
}

function toBase(value, unit) {
  if (UNIT_TABLE[unit]?.m) return { base: 'm', v: value * (UNIT_TABLE[unit].m || 1) }
  if (UNIT_TABLE[unit]?.g) return { base: 'g', v: value * (UNIT_TABLE[unit].g || 1) }
  if (UNIT_TABLE[unit]?.s) return { base: 's', v: value * (UNIT_TABLE[unit].s || 1) }
  return null
}

function fromBase(base, v, unit) {
  if (base === 'm') {
    if (unit === 'm') return v
    const tbl = UNIT_TABLE.m
    return v * (tbl[unit] ?? (1 / (UNIT_TABLE[unit]?.m || NaN)))
  }
  if (base === 'g') {
    if (unit === 'g') return v
    const tbl = UNIT_TABLE.g
    return v * (tbl[unit] ?? (1 / (UNIT_TABLE[unit]?.g || NaN)))
  }
  if (base === 's') {
    if (unit === 's') return v
    const tbl = UNIT_TABLE.s
    return v * (tbl[unit] ?? (1 / (UNIT_TABLE[unit]?.s || NaN)))
  }
  return NaN
}

function unitConvert(value, fromU, toU) {
  // Normalize plural
  const norm = (u) => u.replace(/s$/,'')
  fromU = norm(fromU); toU = norm(toU)
  // Map aliases
  const alias = { secs:'s', sec:'s', second:'s', seconds:'s', mins:'min', minute:'min', minutes:'min', hours:'h', hr:'h', hrs:'h' }
  fromU = alias[fromU] || fromU; toU = alias[toU] || toU
  const b1 = toBase(1, fromU); const b2 = toBase(1, toU)
  if (!b1 || !b2 || b1.base !== b2.base) return { ok: false, reason: 'incompatible-units' }
  const baseVal = toBase(value, fromU).v
  const out = fromBase(b1.base, baseVal, toU)
  const steps = [`Convert ${value} ${fromU} to base ${b1.base}: ${baseVal} ${b1.base}`, `Convert ${baseVal} ${b1.base} to ${toU}: ${out} ${toU}`]
  return { ok: Number.isFinite(out), value: out, steps }
}

export default { solveFromText, solveExpression }
