// 掘金 / CSDN：输出规范化的 Markdown
const CJK = '\\u2e80-\\u2eff\\u2f00-\\u2fdf\\u3040-\\u309f\\u30a0-\\u30ff\\u3100-\\u312f\\u3200-\\u32ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff'

/** 中文与英文、数字之间加空格（跳过行内代码、链接地址、裸网址和 HTML 标签） */
export function spaceCjk(line) {
  const parts = line.split(/(`+[^`]*?`+|\]\([^)]*\)|https?:\/\/\S+|<[^>]+>)/)
  return parts.map((p, i) => (i % 2 ? p : p
    .replace(new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g'), '$1 $2')
    .replace(new RegExp(`([A-Za-z0-9%])([${CJK}])`, 'g'), '$1 $2'))).join('')
}

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/

export function cleanMarkdown(md, { cjkSpace = true, stripFrontMatter = true, defaultLang = 'plaintext' } = {}) {
  let text = md.replace(/\r\n?/g, '\n')
  if (stripFrontMatter) text = text.replace(/^---\n[\s\S]*?\n---\n?/, '')
  const out = []
  const blank = () => out.length && out[out.length - 1] === ''
  let inCode = false, fence = ''
  const breaks = new Set() // 行尾两个空格 = 硬换行，后面还有正文时才保留
  for (let line of text.split('\n')) {
    const f = line.match(FENCE)
    if (inCode) {
      // 关闭围栏：同一种字符、长度不短于开头、后面不能再跟内容（```js 不是关闭）
      if (f && f[2][0] === fence[0] && f[2].length >= fence.length && f[3].trim() === '') {
        inCode = false; out.push(line.trimEnd()); out.push('')
      } else out.push(line) // 代码里的空行、空格原样保留
      continue
    }
    if (f && !(f[2][0] === '`' && f[3].includes('`'))) {
      inCode = true; fence = f[2]
      if (out.length && !blank()) out.push('')
      out.push(`${f[1]}${f[2]}${f[3].trim() || defaultLang}`)
      continue
    }
    const hardBreak = / {2,}$/.test(line)
    line = line.replace(/\s+$/, '')
    if (line === '') { if (!blank()) out.push(''); continue } // 多个空行合并成一个，只在代码块外做
    if (/^( {4}|\t)/.test(line)) { out.push(line); continue } // 缩进 4 格：可能是缩进代码块，不动
    line = line.replace(/^(#{1,6})([^#\s])(?!.*\s#\S)/, '$1 $2')    // 标题 # 后补空格（#话题 #标签 这种不动）
    if (!HR.test(line)) line = line.replace(/^(\s*)[*+] (?=\S)/, '$1- ') // 列表统一用 -，分隔线 * * * 不动
    if (cjkSpace) line = spaceCjk(line)
    if (/^#{1,6} /.test(line)) {
      if (out.length && !blank()) out.push('')
      out.push(line); out.push(''); continue
    }
    if (hardBreak) breaks.add(out.length)
    out.push(line)
  }
  if (inCode) out.push(fence) // 补全未闭合的代码块
  for (const i of breaks) if (out[i + 1]) out[i] += '  '
  while (blank()) out.pop()
  while (out[0] === '') out.shift()
  return out.join('\n') + '\n'
}
