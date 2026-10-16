// 小红书图文卡片：把 Markdown 拆成若干张 3:4 卡片
// 规则：手动分隔符 <!-- card --> 或单独一行 ===；否则按 ## 标题和字数自动分页；代码块不会被拆开
export const CARD_BREAK = /^\s*(<!--\s*card\s*-->|===)\s*$/

function blocks(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out = []; let cur = []; let inCode = false
  const flush = () => { if (cur.join('').trim()) out.push(cur.join('\n')); cur = [] }
  for (const l of lines) {
    if (/^\s*(```|~~~)/.test(l)) { inCode = !inCode; cur.push(l); if (!inCode) flush(); continue }
    if (inCode) { cur.push(l); continue }
    if (CARD_BREAK.test(l)) { flush(); out.push('\u0000BREAK'); continue }
    if (l.trim() === '') { flush(); continue }
    if (/^#{1,6}\s/.test(l)) { flush(); out.push(l); continue }
    cur.push(l)
  }
  flush()
  return out
}

/** 估算一个块的“重量”（以字数计；代码、图片、标题更占空间） */
export function weight(b) {
  if (/^\s*(```|~~~)/.test(b)) return b.split('\n').length * 22
  if (/!\[[^\]]*\]\([^)]+\)/.test(b)) return 220
  if (/^#{1,2}\s/.test(b)) return 40
  return b.replace(/\s/g, '').length + b.split('\n').length * 8
}

export function splitCards(markdown, { maxWeight = 260, coverFromH1 = true } = {}) {
  const bs = blocks(markdown.replace(/^---\n[\s\S]*?\n---\n?/, ''))
  const manual = bs.includes('\u0000BREAK')
  const cards = []; let cur = []; let w = 0
  const push = () => { if (cur.length) cards.push(cur.join('\n\n')); cur = []; w = 0 }
  let cover = null
  for (const b of bs) {
    if (b === '\u0000BREAK') { push(); continue }
    if (coverFromH1 && !cover && !cards.length && !cur.length && /^#\s/.test(b)) { cover = b.replace(/^#\s+/, ''); continue }
    if (!manual) {
      const bw = weight(b)
      if (/^##\s/.test(b) && cur.length) push()
      else if (cur.length && w + bw > maxWeight) push()
      w += bw
    }
    cur.push(b)
  }
  push()
  return { cover, cards }
}
