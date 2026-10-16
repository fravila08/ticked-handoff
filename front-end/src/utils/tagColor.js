// Each tag gets one of a few soft, muted colors.
// The same name always gets the same color.
const SWATCHES = ['sky', 'clay', 'sage', 'lilac', 'sand', 'teal']

const KNOWN = { school: 'sky', urgent: 'clay', errands: 'sage', reading: 'lilac' }

export function tagColor(name) {
  if (KNOWN[name]) return KNOWN[name]
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return SWATCHES[sum % SWATCHES.length]
}
