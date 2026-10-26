import { describe, it, expect } from 'vitest'
import { toWechat, toZhihu, toPreview, splitFrontMatter, highlightInline, preserveSpaces } from '../src/core/render.js'
import { cleanMarkdown, spaceCjk } from '../src/core/clean.js'
import { splitCards, weight } from '../src/core/cards.js'
import { THEMES } from '../src/core/themes.js'

const SAMPLE = `---
title: 测试
---
# 标题

正文 **加粗** 和 [链接](https://example.com)，还有 \`code\`。

\`\`\`js
function a() {
  return 1
}
\`\`\`
`

describe('公众号', () => {
  const html = toWechat(SAMPLE, 'emerald')
  it('不含 class 和 <style>，全部内联样式', () => {
    expect(html).not.toMatch(/class=/)
    expect(html).not.toMatch(/<style/)
    expect(html).toMatch(/<h1 style="[^"]+">标题<\/h1>/)
    expect(html).toContain(THEMES.emerald.colors.primary)
  })
  it('去掉 front matter', () => expect(html).not.toContain('title: 测试'))
  it('外链转成脚注', () => {
    expect(html).not.toMatch(/<a href="https:\/\/example.com/)
    expect(html).toContain('[1] https://example.com')
  })
  it('代码块高亮转成内联颜色，保留缩进和换行', () => {
    expect(html).toMatch(/<span style="color:#[0-9a-f]{6};">function<\/span>/)
    expect(html).toContain('&nbsp;&nbsp;')
    expect(html).toContain('<br/>')
  })
  it('转义 HTML，防止注入', () => {
    const h = toWechat('<script>alert(1)</script>\n\n`<b>`')
    expect(h).not.toContain('<script>')
    expect(h).toContain('&lt;b&gt;')
  })
  it('公众号文章链接保留为可点击', () => expect(toWechat('[看这](https://mp.weixin.qq.com/s/abc)')).toContain('<a href="https://mp.weixin.qq.com/s/abc"'))
  it('代码行中间的连续空格也保留（对齐注释、ASCII 表格）', () => {
    const h = toWechat('```plaintext\nx    = 1  # 对齐\n```')
    expect(h).toContain('x&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;1&nbsp;&nbsp;#')
    expect(preserveSpaces('<span style="color:#fff;">a  b</span>')).toBe('<span style="color:#fff;">a&nbsp;&nbsp;b</span>')
  })
  it('同一外链只编号一次', () => {
    const h = toWechat('[文档](https://a.com/x) 和 [再看](https://a.com/x)，以及 [别的](https://b.com)')
    expect(h.match(/\[1\]<\/sup>/g)).toHaveLength(2)
    expect(h).toContain('[1] https://a.com/x<br/>[2] https://b.com')
    expect(h).not.toContain('[3]')
  })
  it('正文直接写出的网址不重复加脚注', () => {
    const h = toWechat('官网 https://b.com 和 <https://c.com>')
    expect(h).toContain('https://b.com')
    expect(h).not.toContain('参考链接')
    expect(h).not.toContain('<sup')
  })
  it('切换主题颜色', () => expect(toWechat('## 二级', 'orange')).toContain(THEMES.orange.colors.primary))
})

describe('知乎', () => {
  const html = toZhihu(SAMPLE)
  it('输出干净的 HTML，不带内联样式', () => { expect(html).not.toMatch(/style=/); expect(html).toContain('<h1>标题</h1>') })
  it('代码块保留语言标记', () => expect(html).toContain('<pre><code class="language-js">'))
  it('链接保留', () => expect(html).toContain('href="https://example.com"'))
})

describe('预览', () => it('链接可点击', () => expect(toPreview(SAMPLE)).toMatch(/<a href="https:\/\/example.com" style=/)))

describe('front matter / 高亮', () => {
  it('解析 front matter', () => expect(splitFrontMatter(SAMPLE).meta.title).toBe('测试'))
  it('未知语言不报错', () => expect(highlightInline('x = 1', 'nope-lang', {})).toContain('x'))
})

describe('掘金 / CSDN 规范化 Markdown', () => {
  it('中英文之间加空格，代码和链接不动', () => {
    expect(spaceCjk('使用Vue3开发')).toBe('使用 Vue3 开发')
    expect(spaceCjk('这是**加粗**文字')).toBe('这是**加粗**文字')
    expect(spaceCjk('提升50%性能')).toBe('提升 50% 性能')
    expect(spaceCjk('运行`npm i`命令')).toBe('运行`npm i`命令')
    expect(spaceCjk('见[文档](https://a.com/中文)')).toBe('见[文档](https://a.com/中文)')
  })
  it('标题补空格、列表统一、去 front matter、合并空行', () => {
    const out = cleanMarkdown('---\na: 1\n---\n#标题\n* 项目\n\n\n\n正文  ')
    expect(out).toBe('# 标题\n\n- 项目\n\n正文\n')
  })
  it('代码块补默认语言、不改代码内容', () => {
    const out = cleanMarkdown('文字\n```\nconst a=1中文b\n```\n后文')
    expect(out).toContain('```plaintext\nconst a=1中文b\n```')
    expect(out).toMatch(/文字\n\n```/)
  })
  it('补全未闭合的代码块', () => expect(cleanMarkdown('```js\nlet a').trim().endsWith('```')).toBe(true))
  it('代码块里的连续空行原样保留', () => {
    const src = '```python\ndef a():\n    pass\n\n\ndef b():\n    pass\n```\n'
    expect(cleanMarkdown(src)).toBe(src)
  })
  it('```js 不能关闭代码块，带反引号的行不算开头', () => {
    const out = cleanMarkdown('```\n```js\nlet a=1\n```\n后文Vue')
    expect(out).toBe('```plaintext\n```js\nlet a=1\n```\n\n后文 Vue\n')
    expect(cleanMarkdown('```js` 不是围栏')).toBe('```js` 不是围栏\n')
  })
  it('分隔线、#话题、硬换行、缩进代码、HTML 属性不被改坏', () => {
    expect(cleanMarkdown('上文\n\n* * *\n\n下文')).toBe('上文\n\n* * *\n\n下文\n')
    expect(cleanMarkdown('#Vue3 #前端')).toBe('#Vue3 #前端\n')
    expect(cleanMarkdown('第一行  \n第二行')).toBe('第一行  \n第二行\n')
    expect(cleanMarkdown('段落\n\n    s="中文a"')).toBe('段落\n\n    s="中文a"\n')
    expect(cleanMarkdown('<img src="图a.png">')).toBe('<img src="图a.png">\n')
  })
  it('列表里缩进的代码块照样识别', () => {
    const src = '- 第一步\n\n    ```bash\n    npm i中文a\n\n\n    ```\n'
    expect(cleanMarkdown(src)).toBe(src)
  })
  it('可关闭中英文空格', () => expect(cleanMarkdown('用Vue', { cjkSpace: false })).toBe('用Vue\n'))
})

describe('小红书卡片拆分', () => {
  it('H1 作为封面，按 ## 分页', () => {
    const { cover, cards } = splitCards('# 大标题\n\n## 一\n内容一\n\n## 二\n内容二')
    expect(cover).toBe('大标题')
    expect(cards).toHaveLength(2)
    expect(cards[1]).toContain('## 二')
  })
  it('手动分隔符优先', () => {
    const { cards } = splitCards('a\n\n===\n\nb\n\n<!-- card -->\n\nc\n\n## d 同页')
    expect(cards).toEqual(['a', 'b', 'c\n\n## d 同页'])
  })
  it('超长内容按字数自动分页', () => {
    const para = '字'.repeat(150)
    const { cards } = splitCards([para, para, para, para].join('\n\n'), { maxWeight: 260 })
    expect(cards.length).toBeGreaterThanOrEqual(2)
  })
  it('代码块不会被拆开', () => {
    const code = '```js\n' + Array.from({ length: 30 }, (_, i) => `line${i}`).join('\n') + '\n```'
    const { cards } = splitCards('前言\n\n' + code)
    expect(cards.some((c) => c.includes('line0') && c.includes('line29'))).toBe(true)
  })
  it('图片权重较高', () => expect(weight('![a](b.png)')).toBeGreaterThan(weight('短句')))
})
