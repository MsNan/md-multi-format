import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'
import { THEMES, codePalette } from './themes.js'

export const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** 去掉 YAML front matter，返回 { meta, body } */
export function splitFrontMatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { meta: {}, body: md }
  const meta = {}
  for (const line of m[1].split(/\r?\n/)) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '') }
  return { meta, body: md.slice(m[0].length) }
}

/** highlight.js 输出的 class 转成内联颜色 */
export function highlightInline(code, lang, palette) {
  let html
  try { html = lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value : hljs.highlightAuto(code).value } catch { html = escapeHtml(code) }
  return html.replace(/<span class="([^"]+)">/g, (_, cls) => {
    const key = cls.split(/\s+/).map((c) => c.replace(/^hljs-/, '')).find((c) => palette[c]) || ''
    const extra = cls.includes('comment') ? 'font-style:italic;' : ''
    return key ? `<span style="color:${palette[key]};${extra}">` : '<span>'
  })
}

function createMd(themeKey, { inlineStyle, footnoteLinks }) {
  const theme = THEMES[themeKey] || THEMES.emerald
  const S = theme.styles
  const palette = codePalette(theme)
  const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false })
  const st = (k) => (inlineStyle ? ` style="${S[k]}"` : '')

  const tags = { heading_open: null, paragraph_open: 'p', blockquote_open: 'blockquote', bullet_list_open: 'ul', ordered_list_open: 'ol', list_item_open: 'li', table_open: 'table', th_open: 'th', td_open: 'td', strong_open: 'strong', em_open: 'em' }
  for (const [rule, key] of Object.entries(tags)) {
    md.renderer.rules[rule] = (tokens, idx, opts, env, self) => {
      const t = tokens[idx]
      const k = key || t.tag
      if (inlineStyle && S[k]) t.attrJoin('style', S[k])
      return self.renderToken(tokens, idx, opts)
    }
  }
  md.renderer.rules.hr = () => `<hr${st('hr')} />`
  md.renderer.rules.code_inline = (tokens, idx) => `<code${st('code')}>${escapeHtml(tokens[idx].content)}</code>`
  md.renderer.rules.image = (tokens, idx) => {
    const t = tokens[idx]
    return `<img src="${escapeHtml(t.attrGet('src') || '')}" alt="${escapeHtml(t.content)}"${st('img')} />`
  }
  md.renderer.rules.fence = (tokens, idx) => {
    const t = tokens[idx]
    const lang = (t.info || '').trim().split(/\s+/)[0]
    const code = t.content.replace(/\n$/, '')
    if (!inlineStyle) return `<pre><code class="language-${escapeHtml(lang || 'plaintext')}">${escapeHtml(code)}</code></pre>\n`
    // 公众号会吞掉代码里的换行和空格：换行转 <br>，行首空格转 &nbsp;
    const body = highlightInline(code, lang, palette).split('\n').map((l) => l.replace(/^( +)/, (m) => '&nbsp;'.repeat(m.length)).replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')).join('<br/>')
    return `<pre${st('pre')}><code style="${S.preCode}white-space:nowrap;">${body}</code></pre>\n`
  }
  md.renderer.rules.code_block = md.renderer.rules.fence

  if (footnoteLinks) {
    // 公众号正文里的外链不能点击：把链接转成脚注，文末统一列出
    md.renderer.rules.link_open = (tokens, idx, opts, env) => {
      const href = tokens[idx].attrGet('href') || ''
      env.links ||= []
      if (/^https?:\/\/mp\.weixin\.qq\.com/.test(href)) { env.inlineLink = true; return `<a href="${escapeHtml(href)}"${st('a')}>` }
      env.links.push(href); env.inlineLink = false
      return `<span${st('a')}>`
    }
    md.renderer.rules.link_close = (tokens, idx, opts, env) => (env.inlineLink ? '</a>' : `</span><sup style="color:${theme.colors.primary};font-size:12px;">[${env.links.length}]</sup>`)
  } else if (inlineStyle) {
    md.renderer.rules.link_open = (tokens, idx, opts, env, self) => { tokens[idx].attrJoin('style', S.a); return self.renderToken(tokens, idx, opts) }
  }
  return { md, theme }
}

/** 公众号：全部内联样式，外链转脚注 */
export function toWechat(markdown, themeKey = 'emerald') {
  const { body } = splitFrontMatter(markdown)
  const { md, theme } = createMd(themeKey, { inlineStyle: true, footnoteLinks: true })
  const env = {}
  let html = md.render(body, env)
  if (env.links?.length) {
    const S = theme.styles
    html += `<h4 style="${S.h4}">参考链接</h4><p style="${S.footnote}">` + env.links.map((l, i) => `[${i + 1}] ${escapeHtml(l)}`).join('<br/>') + '</p>'
  }
  return `<section style="${theme.styles.wrap}">${html}</section>`
}

/** 知乎：编辑器会重置大部分样式，输出干净的语义化 HTML（代码块保留语言标记） */
export function toZhihu(markdown) {
  const { body } = splitFrontMatter(markdown)
  const { md } = createMd('emerald', { inlineStyle: false, footnoteLinks: false })
  return md.render(body)
}

/** 预览用：带样式的 HTML（和公众号一样，但保留可点击的链接） */
export function toPreview(markdown, themeKey = 'emerald') {
  const { body } = splitFrontMatter(markdown)
  const { md, theme } = createMd(themeKey, { inlineStyle: true, footnoteLinks: false })
  return `<section style="${theme.styles.wrap}">${md.render(body)}</section>`
}

export function renderInline(markdown, themeKey) {
  const { md } = createMd(themeKey, { inlineStyle: true, footnoteLinks: false })
  return md.render(markdown)
}
