// 掘金 / CSDN：输出规范化的 Markdown
const CJK = '\\u2e80-\\u2eff\\u2f00-\\u2fdf\\u3040-\\u309f\\u30a0-\\u30ff\\u3100-\\u312f\\u3200-\\u32ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff'

/** 中文与英文、数字之间加空格（跳过行内代码和链接地址） */
export function spaceCjk(line) {
  const parts = line.split(/(`[^`]*`|\]\([^)]*\)|https?:\/\/\S+)/)
  return parts.map((p, i) => (i % 2 ? p : p
    .replace(new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g'), '$1 $2')
    .replace(new RegExp(`([A-Za-z0-9%])([${CJK}])`, 'g'), '$1 $2'))).join('')
}

export function cleanMarkdown(md, { cjkSpace = true, stripFrontMatter = true, defaultLang = 'plaintext' } = {}) {
  let text = md.replace(/\r\n?/g, '\n')
  if (stripFrontMatter) text = text.replace(/^---\n[\s\S]*?\n---\n?/, '')
  const out = []
  let inCode = false, fence = ''
  for (let line of text.split('\n')) {
    const f = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/)
    if (f && (!inCode || f[2].startsWith(fence))) {
      if (!inCode) {
        inCode = true; fence = f[2]
        const lang = f[3].trim()
        if (out.length && out[out.length - 1].trim() !== '') out.push('')
        out.push(`${f[1]}${f[2]}${lang || defaultLang}`)
      } else { inCode = false; out.push(line.trimEnd()) ; out.push('') }
      continue
    }
    if (inCode) { out.push(line); continue }
    line = line.replace(/\s+$/, '')
    line = line.replace(/^(#{1,6})([^#\s])/, '$1 $2')               // 标题 # 后补空格
    line = line.replace(/^(\s*)[*+] (?=\S)/, '$1- ')                  // 列表统一用 -
    if (cjkSpace) line = spaceCjk(line)
    if (/^#{1,6} /.test(line)) {
      if (out.length && out[out.length - 1] !== '') out.push('')
      out.push(line); out.push(''); continue
    }
    out.push(line)
  }
  if (inCode) out.push(fence) // 补全未闭合的代码块
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
