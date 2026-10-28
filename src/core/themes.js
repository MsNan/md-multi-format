// 排版主题：所有样式都会以内联 style 的形式写进 HTML（公众号会过滤 <style> 和 class）
const base = (c) => ({
  wrap: `font-size:15px;line-height:1.8;color:${c.text};letter-spacing:0.5px;word-break:break-word;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;`,
  h1: `font-size:22px;font-weight:700;color:${c.text};margin:28px 0 16px;text-align:center;`,
  h2: `font-size:19px;font-weight:700;color:${c.primary};margin:28px 0 14px;padding-left:10px;border-left:4px solid ${c.primary};`,
  h3: `font-size:17px;font-weight:700;color:${c.text};margin:22px 0 10px;`,
  h4: `font-size:16px;font-weight:700;color:${c.text};margin:18px 0 8px;`,
  p: `margin:12px 0;`,
  strong: `font-weight:700;color:${c.primary};`,
  em: `font-style:italic;`,
  a: `color:${c.primary};text-decoration:none;border-bottom:1px solid ${c.primary};`,
  blockquote: `margin:16px 0;padding:10px 14px;background:${c.soft};border-left:4px solid ${c.primary};color:${c.muted};border-radius:4px;`,
  code: `font-family:Menlo,Consolas,monospace;font-size:13px;background:${c.soft};color:${c.primary};padding:2px 5px;border-radius:4px;`,
  pre: `margin:16px 0;padding:14px 16px;background:${c.codeBg};border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.6;`,
  preCode: `font-family:Menlo,Consolas,monospace;color:${c.codeText};white-space:pre;display:block;`,
  ul: `margin:12px 0;padding-left:24px;`,
  ol: `margin:12px 0;padding-left:24px;`,
  li: `margin:6px 0;`,
  img: `max-width:100%;border-radius:6px;display:block;margin:16px auto;`,
  hr: `border:none;border-top:1px dashed ${c.border};margin:24px 0;`,
  tableWrap: `max-width:100%;overflow-x:auto;margin:16px 0;`,
  table: `border-collapse:collapse;min-width:100%;margin:0;font-size:14px;word-break:normal;`,
  th: `border:1px solid ${c.border};padding:8px 10px;background:${c.soft};font-weight:700;text-align:left;white-space:nowrap;`,
  td: `border:1px solid ${c.border};padding:8px 10px;min-width:3em;`,
  footnote: `font-size:13px;color:${c.muted};`,
})

export const THEMES = {
  emerald: { name: '翡翠绿', colors: { text: '#2c3e50', primary: '#10b981', soft: '#ecfdf5', muted: '#5b6b79', border: '#d1d5db', codeBg: '#1e1e2e', codeText: '#cdd6f4' } },
  ink: { name: '极简黑', colors: { text: '#222222', primary: '#111111', soft: '#f4f4f5', muted: '#666666', border: '#dddddd', codeBg: '#f6f8fa', codeText: '#24292e' } },
  orange: { name: '活力橙', colors: { text: '#333333', primary: '#f97316', soft: '#fff7ed', muted: '#78716c', border: '#fed7aa', codeBg: '#282c34', codeText: '#abb2bf' } },
  blue: { name: '科技蓝', colors: { text: '#1f2937', primary: '#2563eb', soft: '#eff6ff', muted: '#64748b', border: '#cbd5e1', codeBg: '#0f172a', codeText: '#e2e8f0' } },
}
for (const t of Object.values(THEMES)) t.styles = base(t.colors)

// 代码高亮颜色：深色代码背景和浅色代码背景各一套
const DARK = { keyword: '#c678dd', built_in: '#e6c07b', type: '#e6c07b', literal: '#56b6c2', number: '#d19a66', string: '#98c379', regexp: '#98c379', comment: '#7f848e', title: '#61afef', function: '#61afef', attr: '#d19a66', attribute: '#d19a66', variable: '#e06c75', params: '#abb2bf', tag: '#e06c75', name: '#e06c75', 'selector-class': '#d19a66', 'selector-tag': '#e06c75', property: '#56b6c2', meta: '#61afef', symbol: '#56b6c2', subst: '#abb2bf', addition: '#98c379', deletion: '#e06c75' }
const LIGHT = { keyword: '#d73a49', built_in: '#6f42c1', type: '#6f42c1', literal: '#005cc5', number: '#005cc5', string: '#032f62', regexp: '#032f62', comment: '#6a737d', title: '#6f42c1', function: '#6f42c1', attr: '#005cc5', attribute: '#005cc5', variable: '#e36209', params: '#24292e', tag: '#22863a', name: '#22863a', 'selector-class': '#6f42c1', 'selector-tag': '#22863a', property: '#005cc5', meta: '#735c0f', symbol: '#005cc5', subst: '#24292e', addition: '#22863a', deletion: '#b31d28' }
export function codePalette(theme) {
  const bg = theme.colors.codeBg.replace('#', '')
  const lum = parseInt(bg.slice(0, 2), 16) * 0.299 + parseInt(bg.slice(2, 4), 16) * 0.587 + parseInt(bg.slice(4, 6), 16) * 0.114
  return lum < 128 ? DARK : LIGHT
}
