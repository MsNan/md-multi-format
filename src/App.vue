<template>
  <div class="app">
    <header class="top">
      <div class="logo">🪄 <b>多平台排版</b><span class="sub">公众号 · 知乎 · 掘金 · 小红书卡片</span></div>
      <div class="tools">
        <label class="field">主题
          <select v-model="theme" aria-label="排版主题"><option v-for="(t, k) in THEMES" :key="k" :value="k">{{ t.name }}</option></select>
        </label>
        <button class="btn" :aria-label="dark ? '切换浅色' : '切换深色'" @click="toggleDark">{{ dark ? '🌞' : '🌙' }}</button>
        <a class="btn hide-sm" href="#donate" @click.prevent="showDonate = true">☕ 打赏</a>
        <a class="btn hide-sm" href="https://github.com/MsNan/md-multi-format" target="_blank" rel="noopener">GitHub</a>
      </div>
    </header>

    <nav class="tabs" role="tablist">
      <button v-for="t in TABS" :key="t.key" role="tab" :aria-selected="tab === t.key" :class="['tab', { on: tab === t.key }]" @click="tab = t.key">{{ t.icon }} {{ t.label }}</button>
    </nav>
    <div class="mobile-switch">
      <button :class="{ on: pane === 'edit' }" @click="pane = 'edit'">✏️ 编辑</button>
      <button :class="{ on: pane === 'preview' }" @click="pane = 'preview'">👀 预览</button>
    </div>

    <main class="main">
      <section :class="['pane', 'editor', { hidden: pane !== 'edit' }]">
        <div class="pane-head">
          <span>Markdown</span>
          <span class="muted">{{ saved ? '✓ 草稿已自动保存' : '保存中…' }} · {{ text.length }} 字</span>
          <button class="btn" @click="resetSample">示例</button>
          <button class="btn" @click="clearText">清空</button>
        </div>
        <textarea v-model="text" class="md" spellcheck="false" placeholder="在这里粘贴或输入 Markdown…" aria-label="Markdown 输入" />
      </section>

      <section :class="['pane', 'preview', { hidden: pane !== 'preview' }]">
        <div class="pane-head">
          <span>{{ current.desc }}</span>
          <template v-if="tab === 'xhs'">
            <label class="field">卡片风格 <select v-model="cardStyle"><option v-for="(s, k) in CARD_STYLES" :key="k" :value="k">{{ s.name }}</option></select></label>
            <input v-model="author" type="text" placeholder="署名，如 @涛哥" style="width: 120px" />
            <button class="btn primary" :disabled="exporting" @click="exportAll">{{ exporting ? '导出中…' : '⬇️ 导出全部 PNG' }}</button>
          </template>
          <button v-else class="btn primary" @click="copy">{{ copied ? '✅ 已复制' : current.copyLabel }}</button>
        </div>
        <div class="preview-body">
          <div v-if="tab === 'wechat'" class="phone"><div v-html="wechatHtml" /></div>
          <div v-else-if="tab === 'zhihu'" class="paper zhihu" v-html="zhihuHtml" />
          <pre v-else-if="tab === 'juejin'" class="paper md-out">{{ cleanMd }}</pre>
          <XhsCards v-else ref="cardsRef" :markdown="text" :theme="theme" :card-style="cardStyle" :author="author" />
          <p class="hint">{{ current.hint }}</p>
        </div>
      </section>
    </main>

    <footer class="foot">
      仅做格式转换，不会自动发布到任何平台 · 全部在浏览器本地处理 ·
      <a href="https://github.com/MsNan/vue-uniapp-skills" target="_blank" rel="noopener">vue-uniapp-skills</a> ·
      <a href="https://github.com/MsNan/cn-dev-mcp" target="_blank" rel="noopener">cn-dev-mcp</a> ·
      <a href="https://msnan.github.io/prompt-hub-cn/" target="_blank" rel="noopener">提示词百宝箱</a> ·
      <a href="https://msnan.github.io" target="_blank" rel="noopener">涛哥的博客</a>
    </footer>

    <div v-if="showDonate" class="modal" role="dialog" aria-modal="true" aria-label="打赏支持" @click.self="showDonate = false" @keydown.esc="showDonate = false">
      <div class="modal-box">
        <h2>☕ 打赏支持</h2>
        <p class="muted">这个工具完全免费、开源，没有广告。觉得好用的话，欢迎请我喝杯咖啡，或者去 GitHub 点个 ⭐</p>
        <div class="qrs">
          <figure><img :src="base + 'wechat.jpg'" alt="微信赞赏码" /><figcaption>微信</figcaption></figure>
          <figure><img :src="base + 'alipay.jpg'" alt="支付宝收款码" /><figcaption>支付宝</figcaption></figure>
        </div>
        <button class="btn" @click="showDonate = false">关闭</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { THEMES } from './core/themes.js'
import { toWechat, toZhihu } from './core/render.js'
import { cleanMarkdown } from './core/clean.js'
import { copyRich, copyPlain } from './clipboard.js'
import { SAMPLE } from './sample.js'
import XhsCards, { CARD_STYLES } from './components/XhsCards.vue'

const base = import.meta.env.BASE_URL
const TABS = [
  { key: 'wechat', icon: '💬', label: '公众号', desc: '公众号 · 内联样式', copyLabel: '📋 复制到公众号', hint: '复制后直接粘贴到公众号编辑器。外链会转成文末脚注（公众号正文不能点外链）。' },
  { key: 'zhihu', icon: '🔵', label: '知乎', desc: '知乎 · 富文本', copyLabel: '📋 复制到知乎', hint: '复制后粘贴到知乎编辑器。代码块会保留语言，标题、列表、表格、引用都会保留。' },
  { key: 'juejin', icon: '⛏️', label: '掘金 / CSDN', desc: '规范化 Markdown', copyLabel: '📋 复制 Markdown', hint: '已经做了这些规范：中英文之间加空格、标题后补空格、代码块补语言、去掉 front matter、合并多余空行。' },
  { key: 'xhs', icon: '📕', label: '小红书卡片', desc: '小红书 · 3:4 图文卡片', hint: '一级标题会生成封面。单独一行写 === 可以手动分页，否则按二级标题和字数自动分页。导出尺寸为 1080×1440。' },
]
const tab = ref(localStorage.getItem('mmf-tab') || 'wechat')
const pane = ref('edit')
const current = computed(() => TABS.find((t) => t.key === tab.value) || TABS[0])
const theme = ref(localStorage.getItem('mmf-theme') || 'emerald')
const cardStyle = ref(localStorage.getItem('mmf-card') || 'fresh')
const author = ref(localStorage.getItem('mmf-author') || '')
const text = ref(localStorage.getItem('mmf-draft') ?? SAMPLE)
const saved = ref(true)
let timer
watch(text, (v) => { saved.value = false; clearTimeout(timer); timer = setTimeout(() => { localStorage.setItem('mmf-draft', v); saved.value = true }, 400) })
watch([tab, theme, cardStyle, author], () => { localStorage.setItem('mmf-tab', tab.value); localStorage.setItem('mmf-theme', theme.value); localStorage.setItem('mmf-card', cardStyle.value); localStorage.setItem('mmf-author', author.value) })

const wechatHtml = computed(() => toWechat(text.value, theme.value))
const zhihuHtml = computed(() => toZhihu(text.value))
const cleanMd = computed(() => cleanMarkdown(text.value))

const copied = ref(false)
async function copy() {
  let ok = false
  if (tab.value === 'wechat') ok = await copyRich(wechatHtml.value, cleanMd.value)
  else if (tab.value === 'zhihu') ok = await copyRich(zhihuHtml.value, cleanMd.value)
  else ok = await copyPlain(cleanMd.value)
  copied.value = ok
  if (!ok) alert('复制失败，请手动选中预览区内容复制')
  setTimeout(() => (copied.value = false), 1500)
}
const cardsRef = ref(), exporting = ref(false)
async function exportAll() { exporting.value = true; try { await cardsRef.value.exportAll() } finally { exporting.value = false } }
function resetSample() { if (text.value === SAMPLE || confirm('用示例替换当前内容？')) text.value = SAMPLE }
function clearText() { if (!text.value || confirm('确定清空？草稿也会被清空')) text.value = '' }

const dark = ref(document.documentElement.classList.contains('dark'))
function toggleDark() { dark.value = !dark.value; document.documentElement.classList.toggle('dark', dark.value); localStorage.setItem('mmf-dark', dark.value ? '1' : '0') }
const showDonate = ref(false)
const checkHash = () => { if (location.hash === '#donate') showDonate.value = true }
onMounted(() => { checkHash(); window.addEventListener('hashchange', checkHash) })
watch(showDonate, (v) => { if (!v && location.hash === '#donate') history.replaceState(null, '', location.pathname) })
</script>
<style scoped>
.app { display: flex; flex-direction: column; height: 100%; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.logo { font-size: 17px; display: flex; align-items: baseline; gap: 8px; }
.sub { color: var(--muted); font-size: 13px; }
.tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.field { display: flex; align-items: center; gap: 6px; color: var(--muted); }
.tabs { display: flex; gap: 4px; padding: 8px 16px 0; overflow-x: auto; background: var(--panel); border-bottom: 1px solid var(--border); }
.tab { border: none; background: none; padding: 10px 14px; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; color: var(--muted); }
.tab.on { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }
.mobile-switch { display: none; }
.main { flex: 1; display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
.pane { display: flex; flex-direction: column; min-height: 0; }
.editor { border-right: 1px solid var(--border); }
.pane-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--panel); flex-wrap: wrap; min-height: 52px; }
.pane-head > span:first-child { font-weight: 600; margin-right: auto; }
.muted { color: var(--muted); font-size: 12px; }
.md { flex: 1; width: 100%; border: none; resize: none; padding: 16px; background: var(--panel); outline: none; font: 14px/1.7 ui-monospace, Menlo, Consolas, monospace; }
.preview-body { flex: 1; overflow: auto; padding: 20px; }
.phone { max-width: 420px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 20px 16px; box-shadow: 0 6px 24px rgba(0,0,0,.08); color: #333; }
.paper { max-width: 720px; margin: 0 auto; background: #fff; color: #1a1a1a; border-radius: 10px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.zhihu :deep(pre) { background: #f6f6f6; padding: 12px; border-radius: 6px; overflow-x: auto; }
.zhihu :deep(code) { font-family: Menlo, Consolas, monospace; font-size: 13px; }
.zhihu :deep(blockquote) { border-left: 3px solid #d3d3d3; margin: 0; padding-left: 12px; color: #646464; }
.zhihu :deep(table) { border-collapse: collapse; } .zhihu :deep(th), .zhihu :deep(td) { border: 1px solid #ddd; padding: 6px 10px; }
.md-out { white-space: pre-wrap; word-break: break-word; font: 13px/1.7 ui-monospace, Menlo, Consolas, monospace; margin: 0 auto; }
html.dark .phone, html.dark .paper { box-shadow: none; }
.hint { max-width: 720px; margin: 16px auto 0; color: var(--muted); font-size: 12px; text-align: center; }
.foot { padding: 8px 16px; font-size: 12px; color: var(--muted); text-align: center; border-top: 1px solid var(--border); background: var(--panel); }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
.modal-box { background: var(--panel); border-radius: 14px; padding: 24px; text-align: center; max-width: 560px; width: 100%; max-height: 90vh; overflow: auto; }
.modal-box h2 { margin-top: 0; }
.qrs { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin: 16px 0; }
.qrs figure { margin: 0; } .qrs img { width: 200px; max-width: 70vw; border-radius: 10px; } .qrs figcaption { color: var(--muted); }
@media (max-width: 860px) {
  .main { grid-template-columns: 1fr; }
  .mobile-switch { display: flex; background: var(--panel); border-bottom: 1px solid var(--border); }
  .mobile-switch button { flex: 1; border: none; background: none; padding: 10px; cursor: pointer; color: var(--muted); }
  .mobile-switch .on { color: var(--brand); font-weight: 600; background: var(--soft); }
  .pane.hidden { display: none; }
  .editor { border-right: none; }
  .sub, .hide-sm { display: none; }
  .preview-body { padding: 12px; }
}
</style>
