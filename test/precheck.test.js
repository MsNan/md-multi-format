import { describe, it, expect } from 'vitest'
import { precheckMarkdown, extractFirstH1 } from '../src/core/precheck.js'

/** 生成约 n 个汉字的正文，避免每个用例手写 250 字 */
function longBody(n = 260) {
  return '这是一篇正常的技术分享，介绍如何在本地把 Markdown 转成多平台格式。'.repeat(Math.ceil(n / 30)).slice(0, n)
}

describe('extractFirstH1', () => {
  it('取第一个一级标题，忽略 front matter', () => {
    expect(extractFirstH1('---\ntitle: x\n---\n# 真实标题\n\n正文')).toBe('真实标题')
  })
})

describe('precheckMarkdown', () => {
  it('标题党命中 → error，ok=false', () => {
    const r = precheckMarkdown(`# 震惊！一周精通 Vue\n\n${longBody()}`, { platform: 'juejin' })
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i.id === 'title-bait' && i.level === 'error')).toBe(true)
  })

  it('干净标题不报标题党', () => {
    const r = precheckMarkdown(`# Vue3 组合式 API 实践笔记\n\n${longBody()}`, { platform: 'juejin' })
    expect(r.issues.find((i) => i.id === 'title-bait')).toBeUndefined()
    expect(r.ok).toBe(true)
  })

  it('可用 opts.title 覆盖 H1', () => {
    const r = precheckMarkdown(`# 正常标题\n\n${longBody()}`, { title: '不看后悔的 CSS 技巧', platform: 'juejin' })
    expect(r.issues.some((i) => i.id === 'title-bait')).toBe(true)
  })

  it('正文过短 → warn', () => {
    const r = precheckMarkdown('# 短文\n\n只有几句话。', { platform: 'juejin' })
    const short = r.issues.find((i) => i.id === 'body-too-short')
    expect(short).toBeTruthy()
    expect(short.level).toBe('warn')
  })

  it('代码块不计入篇幅，仍可能过短', () => {
    const r = precheckMarkdown(`# 标题\n\n\`\`\`js\n${'x'.repeat(400)}\n\`\`\`\n\n短说明`, { platform: 'csdn' })
    expect(r.issues.some((i) => i.id === 'body-too-short')).toBe(true)
  })

  it('外链 ≥8 去重 → warn', () => {
    const links = Array.from({ length: 8 }, (_, i) => `[文档${i}](https://example.com/p/${i})`).join(' ')
    const r = precheckMarkdown(`# 链接很多\n\n${longBody()}\n\n${links}`, { platform: 'juejin' })
    expect(r.issues.some((i) => i.id === 'too-many-links')).toBe(true)
  })

  it('图片链接与代码块内 URL 不计入外链', () => {
    const imgs = Array.from({ length: 9 }, (_, i) => `![图${i}](https://cdn.example.com/${i}.png)`).join('\n')
    const r = precheckMarkdown(`# 图多\n\n${longBody()}\n\n${imgs}\n\n\`\`\`\nhttps://secret.example.com/in-code\n\`\`\``, { platform: 'juejin' })
    expect(r.issues.find((i) => i.id === 'too-many-links')).toBeUndefined()
  })

  it('小红书任意外链 → warn', () => {
    const r = precheckMarkdown(`# 笔记\n\n${longBody()}\n\n详见 [官网](https://example.com)`, { platform: 'xhs' })
    expect(r.issues.some((i) => i.id === 'xhs-outbound-link')).toBe(true)
    expect(r.issues.find((i) => i.id === 'too-many-links')).toBeUndefined()
  })

  it('引流话术 → warn', () => {
    const r = precheckMarkdown(`# 学习资料\n\n${longBody()}\n\n加微信领取完整源码`, { platform: 'wechat' })
    expect(r.issues.some((i) => i.id === 'promo-drain' && i.level === 'warn')).toBe(true)
  })

  it('绝对化用语 → warn', () => {
    const r = precheckMarkdown(`# 一定能学会的 TypeScript\n\n${longBody()}`, { platform: 'juejin' })
    expect(r.issues.some((i) => i.id === 'absolute-claim' && i.detail === '一定能')).toBe(true)
  })

  it('无 H1 且未传 title → title-empty warn', () => {
    const r = precheckMarkdown(longBody(), { platform: 'zhihu' })
    expect(r.issues.some((i) => i.id === 'title-empty')).toBe(true)
  })
})
