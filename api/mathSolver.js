// Minimal math solver: parses simple arithmetic expressions and returns steps
// Supports +, -, *, /, ^, parentheses, and common symbols/words (× x ÷ plus minus times divided by)

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

export default { solveFromText, solveExpression }
