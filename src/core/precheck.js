/**
 * 发布前确定性检查（不联网、无敏感词大库）。
 * 规则面向掘金/CSDN/公众号常见拒稿点：标题党、绝对化用语、篇幅过短、外链过多、引流痕迹。
 * 结果仅为提示，不代替平台审核 API。
 */

/** 标题党套路（短名单，偏掘金常见拒稿词；短语级，避免单字误伤） */
const TITLE_BAIT = [
  /震惊/,
  /不看后悔/,
  /迄今为止最全/,
  /史上最全/,
  /必看/,
  /干货竟然/,
  /小姐姐助力/,
  /女朋友学会/,
  /男朋友学会/,
  /速进/,
  /码住再看/,
  /收藏永不吃亏/,
  /看完当场/,
  /一周精通/,
]

/** 绝对化用语（warn） */
const ABSOLUTE = /100%|永久免费|绝对不会|一定能|保证|万能/

/** 引流 / 私域痕迹（warn） */
const PROMO = /加微信|加我微信|扫码进群|扫码关注|私信领取|VX\s*[:：]|微信\s*[:：]\s*\w|二维码/

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/
const IMG_MD = /!\[[^\]]*]\(\s*<?https?:\/\/[^)\s>]+>?[^)]*\)/gi
const LINK_MD = /\[[^\]]*]\(\s*<?(https?:\/\/[^)\s>]+)>?[^)]*\)/gi
const BARE_URL = /(?<![\("'])https?:\/\/[^\s<>\)\]"'`]+/gi

/** @param {string} md */
function stripFrontMatter(md) {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/** 去掉围栏代码块内容（保留围栏外正文） @param {string} md */
function stripCodeFences(md) {
  const out = []
  let inCode = false
  let fence = ''
  for (const line of md.replace(/\r\n?/g, '\n').split('\n')) {
    const f = line.match(FENCE)
    if (inCode) {
      if (f && f[2][0] === fence[0] && f[2].length >= fence.length && f[3].trim() === '') {
        inCode = false
      }
      continue
    }
    if (f && !(f[2][0] === '`' && f[3].includes('`'))) {
      inCode = true
      fence = f[2]
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

/** 从正文提取第一级 H1 标题文本 @param {string} md */
export function extractFirstH1(md) {
  const body = stripFrontMatter(md.replace(/\r\n?/g, '\n'))
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : ''
}

/** 统计中文 + 拉丁字母数字字符数（去掉空白与常见标记后的近似篇幅） @param {string} text */
function countContentChars(text) {
  const cleaned = text
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#>*_\-|]+/g, ' ')
  const m = cleaned.match(/[\u4e00-\u9fffA-Za-z0-9]/g)
  return m ? m.length : 0
}

/** 收集围栏外、非图片的 http(s) 外链（去重） @param {string} md */
function collectExternalUrls(md) {
  const noImg = stripCodeFences(md).replace(IMG_MD, ' ')
  const urls = new Set()
  for (const re of [LINK_MD, BARE_URL]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(noImg))) {
      const raw = (m[1] || m[0]).replace(/[.,;:!?)]+$/, '')
      if (/^https?:\/\//i.test(raw)) urls.add(raw)
    }
  }
  return [...urls]
}

/**
 * @typedef {{ id: string, level: 'error'|'warn', message: string, detail?: string }} PrecheckIssue
 * @typedef {{ ok: boolean, issues: PrecheckIssue[] }} PrecheckResult
 */

/**
 * 对 Markdown 做发布前轻量检查。
 * @param {string} md
 * @param {{ title?: string, platform?: 'wechat'|'zhihu'|'juejin'|'csdn'|'xhs'|string }} [opts]
 * @returns {PrecheckResult}
 */
export function precheckMarkdown(md = '', { title, platform } = {}) {
  const issues = []
  const raw = String(md ?? '')
  const body = stripFrontMatter(raw)
  const resolvedTitle = (title != null && String(title).trim() !== '')
    ? String(title).trim()
    : extractFirstH1(body)

  if (!resolvedTitle) {
    issues.push({
      id: 'title-empty',
      level: 'warn',
      message: '未检测到标题（一级 # 标题或传入 title）',
    })
  } else {
    const latinWords = resolvedTitle.match(/[A-Za-z]+/g) || []
    const hasCjk = /[\u4e00-\u9fff]/.test(resolvedTitle)
    if (!hasCjk && latinWords.length > 0 && latinWords.length <= 2 && resolvedTitle.replace(/\s+/g, '').length < 12) {
      issues.push({
        id: 'title-too-short',
        level: 'warn',
        message: '标题过短或仅有少量英文词，平台推荐效果可能较差',
        detail: resolvedTitle,
      })
    }

    for (const re of TITLE_BAIT) {
      if (re.test(resolvedTitle)) {
        issues.push({
          id: 'title-bait',
          level: 'error',
          message: '标题含标题党套路用语，掘金等平台可能拒稿或限流',
          detail: resolvedTitle,
        })
        break
      }
    }
  }

  const opening = stripCodeFences(body).replace(/\s+/g, '').slice(0, 200)
  const absTarget = `${resolvedTitle}\n${opening}`
  const absMatch = absTarget.match(ABSOLUTE)
  if (absMatch) {
    issues.push({
      id: 'absolute-claim',
      level: 'warn',
      message: '标题或开头含绝对化用语，建议改成可验证表述',
      detail: absMatch[0],
    })
  }

  const prose = stripCodeFences(body)
  const chars = countContentChars(prose)
  const shortPlatforms = !platform || platform === 'juejin' || platform === 'csdn' || platform === 'wechat' || platform === 'zhihu'
  if (shortPlatforms && chars < 250) {
    issues.push({
      id: 'body-too-short',
      level: 'warn',
      message: `正文约 ${chars} 字（去掉代码块后），掘金/CSDN 等常建议 ≥250 字`,
      detail: `chars=${chars}`,
    })
  }

  const urls = collectExternalUrls(body)
  if (platform === 'xhs' && urls.length > 0) {
    issues.push({
      id: 'xhs-outbound-link',
      level: 'warn',
      message: `小红书不建议外链，当前检测到 ${urls.length} 个外链`,
      detail: urls.slice(0, 3).join(', '),
    })
  } else if (urls.length >= 8) {
    issues.push({
      id: 'too-many-links',
      level: 'warn',
      message: `外链较多（${urls.length} 个去重 URL），技术平台一般允许但过多可能被判营销`,
      detail: urls.slice(0, 5).join(', '),
    })
  }

  const promoSrc = `${resolvedTitle}\n${prose}`
  const promoMatch = promoSrc.match(PROMO)
  if (promoMatch) {
    issues.push({
      id: 'promo-drain',
      level: 'warn',
      message: '疑似引流话术（加微信/扫码进群/私信领取等），多数技术平台会限流',
      detail: promoMatch[0],
    })
  }

  return { ok: !issues.some((i) => i.level === 'error'), issues }
}
