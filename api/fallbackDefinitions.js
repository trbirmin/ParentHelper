// Simple fallback definitions for common K–12 math terms when AI is not configured

function normalize(s = '') {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim()
}

const entries = [
  // --- Science: Temperature & conversions ---
  {
    keys: [/\b(celsius\s*to\s*fahrenheit|°?c\s*to\s*°?f|c to f)\b/i],
    subject: 'science',
    answer: 'Convert °C to °F: F = C × 9/5 + 32.',
    explanation: 'Example: 20°C → 20 × 9/5 + 32 = 68°F.'
  },
  {
    keys: [/\b(fahrenheit\s*to\s*celsius|°?f\s*to\s*°?c|f to c)\b/i],
    subject: 'science',
    answer: 'Convert °F to °C: C = (F − 32) × 5/9.',
    explanation: 'Example: 68°F → (68 − 32) × 5/9 = 20°C.'
  },
  {
    keys: [/\b(kelvin\s*to\s*celsius|k to c)\b/i],
    subject: 'science',
    answer: 'Convert K to °C: C = K − 273.15.',
    explanation: 'Example: 300 K → 300 − 273.15 = 26.85°C.'
  },
  {
    keys: [/\b(celsius\s*to\s*kelvin|c to k)\b/i],
    subject: 'science',
    answer: 'Convert °C to K: K = C + 273.15.',
    explanation: 'Example: 25°C → 25 + 273.15 = 298.15 K.'
  },
  {
    keys: [/\b(fahrenheit\s*to\s*kelvin|f to k)\b/i],
    subject: 'science',
    answer: 'Convert °F to K: K = (F − 32) × 5/9 + 273.15.',
    explanation: 'Example: 68°F → (68 − 32) × 5/9 + 273.15 = 293.15 K.'
  },
  {
    keys: [/\b(what\s+is\s+temperature|define\s+temperature|temperature\s+definition)\b/i],
    subject: 'science',
    answer: 'Temperature measures how hot or cold something is—related to the average kinetic energy of its particles.',
    explanation: 'Common units are Celsius (°C), Fahrenheit (°F), and Kelvin (K). We measure temperature with a thermometer.'
  },
  {
    keys: [/\b(how\s+do\s+i\s+calculate\s+temperature|how\s+to\s+calculate\s+temperature)\b/i],
    subject: 'science',
    answer: 'Use a thermometer to measure; use conversion formulas to change units.',
    explanation: 'Conversions: C = (F − 32) × 5/9, F = C × 9/5 + 32, K = C + 273.15. Choose the formula based on the units you have and need.'
  },
  {
    keys: [/\bfraction\b/],
    subject: 'math',
    answer: 'A fraction is a way to show part of a whole using two numbers: numerator/denominator.',
    explanation:
      'The top number (numerator) tells how many parts you have. The bottom number (denominator) tells how many equal parts the whole is split into. For example, 3/4 means 3 parts out of 4 equal parts.'
  },
  {
    keys: [/\bprime\s+number\b/],
    subject: 'math',
    answer: 'A prime number has exactly two factors: 1 and itself.',
    explanation: 'Examples: 2, 3, 5, 7, 11. 1 is not prime because it has only one factor.'
  },
  {
    keys: [/\bcomposite\s+number\b/],
    subject: 'math',
    answer: 'A composite number has more than two factors.',
    explanation: 'Examples: 4, 6, 8, 9, 10. These have divisors besides 1 and themselves.'
  },
  {
    keys: [/\bfactor\b/],
    subject: 'math',
    answer: 'A factor is a number that divides another number without a remainder.',
    explanation: 'For 12, the factors are 1, 2, 3, 4, 6, 12.'
  },
  {
    keys: [/\bmultiple\b/],
    subject: 'math',
    answer: 'A multiple is the result of multiplying a number by whole numbers.',
    explanation: 'Multiples of 4 are 4, 8, 12, 16, …'
  },
  {
    keys: [/\beven\s+number\b/],
    subject: 'math',
    answer: 'An even number is divisible by 2.',
    explanation: 'Ends in 0, 2, 4, 6, or 8.'
  },
  {
    keys: [/\bodd\s+number\b/],
    subject: 'math',
    answer: 'An odd number is not divisible by 2.',
    explanation: 'Ends in 1, 3, 5, 7, or 9.'
  },
  {
    keys: [/\binteger\b/],
    subject: 'math',
    answer: 'Integers are whole numbers and their negatives, including zero.',
    explanation: '…, -3, -2, -1, 0, 1, 2, 3, …'
  },
  {
    keys: [/\bwhole\s+number\b/],
    subject: 'math',
    answer: 'Whole numbers are 0 and the positive integers.',
    explanation: '0, 1, 2, 3, … (no negatives, no fractions).'
  },
  {
    keys: [/\bdecimal\b/],
    subject: 'math',
    answer: 'A decimal is a number written with a decimal point to show parts of a whole.',
    explanation: 'For example, 0.5 means five tenths.'
  },
  {
    keys: [/\bpercent(age)?\b/],
    subject: 'math',
    answer: 'Percent means “per 100.”',
    explanation: '50% = 50 out of 100 = 0.5.'
  },
  {
    keys: [/\bplace\s+value\b/],
    subject: 'math',
    answer: 'Place value tells what a digit is worth based on its position.',
    explanation: 'In 3,482 the 3 is thousands, 4 is hundreds, 8 is tens, 2 is ones.'
  },
  {
    keys: [/\bperimeter\b/],
    subject: 'math',
    answer: 'Perimeter is the distance around a shape.',
    explanation: 'Add the lengths of all sides.'
  },
  {
    keys: [/\barea\b/],
    subject: 'math',
    answer: 'Area measures the surface inside a shape.',
    explanation: 'For rectangles: length × width.'
  },
  {
    keys: [/\bvolume\b/],
    subject: 'math',
    answer: 'Volume measures how much space a 3D object takes up.',
    explanation: 'For rectangular prisms: length × width × height.'
  },
  {
    keys: [/\bmean\b/],
    subject: 'math',
    answer: 'Mean is the average of a set of numbers.',
    explanation: 'Add them up and divide by how many there are.'
  },
  {
    keys: [/\bmedian\b/],
    subject: 'math',
    answer: 'Median is the middle value when numbers are in order.',
    explanation: 'If there are two middle numbers, average them.'
  },
  {
    keys: [/\bmode\b/],
    subject: 'math',
    answer: 'Mode is the number that appears most often.',
    explanation: 'A set can have more than one mode or none.'
  },
  {
    keys: [/\brange\b/],
    subject: 'math',
    answer: 'Range is the difference between the largest and smallest values.',
    explanation: 'Range = max − min.'
  },
  {
    keys: [/\bnumerator\b/],
    subject: 'math',
    answer: 'The numerator is the top number in a fraction.',
    explanation: 'It shows how many parts are being counted. In 3/5, the numerator is 3.'
  },
  {
    keys: [/\bdenominator\b/],
    subject: 'math',
    answer: 'The denominator is the bottom number in a fraction.',
    explanation: 'It shows how many equal parts the whole is split into. In 3/5, the denominator is 5.'
  },
  {
    keys: [/\bmixed\s+number\b/],
    subject: 'math',
    answer: 'A mixed number has a whole number and a fraction together (like 2 1/3).',
    explanation: 'It represents more than one whole. 2 1/3 means 2 wholes plus one third.'
  },
  {
    keys: [/\bimproper\s+fraction\b/],
    subject: 'math',
    answer: 'An improper fraction has a numerator that is greater than or equal to the denominator (like 7/4).',
    explanation: 'It is at least one whole. You can convert it to a mixed number (7/4 = 1 3/4).'
  },
  {
    keys: [/\bequivalent\s+fractions?\b/],
    subject: 'math',
    answer: 'Equivalent fractions name the same amount, even if the numbers look different (like 1/2 and 2/4).',
    explanation: 'You can make equivalent fractions by multiplying or dividing the numerator and denominator by the same number.'
  },
  {
    keys: [/\bsimplify\b.*\bfraction\b|\bfraction\b.*\bsimplify\b/],
    subject: 'math',
    answer: 'To simplify a fraction, divide the top and bottom by their greatest common factor (GCF).',
    explanation: 'Keep dividing numerator and denominator by the same number until they have no common factor greater than 1. For example, 4/12 ÷ 4 = 1/3.'
  },
  {
    keys: [/\bproduct\b/],
    subject: 'math',
    answer: 'Product means the result of multiplication.',
    explanation: 'For example, the product of 3 and 4 is 12.'
  },
  {
    keys: [/\bsum\b/],
    subject: 'math',
    answer: 'Sum means the result of addition.',
    explanation: 'For example, the sum of 7 and 5 is 12.'
  },
  {
    keys: [/\bdifference\b/],
    subject: 'math',
    answer: 'Difference means the result of subtraction.',
    explanation: 'For example, the difference of 10 and 6 is 4.'
  },
  {
    keys: [/\bquotient\b/],
    subject: 'math',
    answer: 'Quotient means the result of division.',
    explanation: 'For example, the quotient of 12 ÷ 3 is 4.'
  }
]

export function getDefinition(question = '') {
  const q = normalize(question)
  for (const e of entries) {
    if (e.keys.some((k) => k.test(q))) {
      return {
        ok: true,
        subject: e.subject,
        answer: e.answer,
        explanation: e.explanation,
      }
    }
  }
  return { ok: false }
}

export default { getDefinition }
