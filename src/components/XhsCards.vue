<script>
export const CARD_STYLES = {
  fresh: { name: '薄荷清新', bg: 'linear-gradient(160deg,#ecfdf5 0%,#ffffff 55%)', accent: '#10b981', text: '#1f2937', coverBg: 'linear-gradient(150deg,#10b981,#0ea5e9)', coverText: '#ffffff' },
  cream: { name: '奶油便签', bg: '#fffaf0', accent: '#f97316', text: '#3f3a36', coverBg: 'linear-gradient(150deg,#fde68a,#fdba74)', coverText: '#3f2d1f' },
  night: { name: '暗夜极客', bg: '#111827', accent: '#34d399', text: '#e5e7eb', coverBg: 'linear-gradient(150deg,#0f172a,#1e3a8a)', coverText: '#f8fafc' },
  pink: { name: '少女粉', bg: 'linear-gradient(170deg,#fff1f2,#ffffff)', accent: '#ec4899', text: '#3b2330', coverBg: 'linear-gradient(150deg,#f9a8d4,#c4b5fd)', coverText: '#3b0a2a' },
}
</script>
<template>
  <div class="xhs">
    <div v-for="(c, i) in pages" :key="i" class="card-wrap">
      <div ref="cardEls" class="card" :style="cardStyleOf(c)">
        <template v-if="c.cover">
          <div class="cover-inner">
            <div class="cover-badge" :style="{ background: 'rgba(255,255,255,.22)' }">📌 干货笔记</div>
            <h1 class="cover-title">{{ c.cover }}</h1>
            <div class="cover-meta">共 {{ pages.length }} 页 · 建议收藏</div>
          </div>
        </template>
        <div v-else class="content" :style="{ color: S.text }" v-html="c.html" />
        <div class="foot" :style="{ color: c.cover ? S.coverText : S.accent }">
          <span>{{ author || ' ' }}</span><span>{{ i + 1 }} / {{ pages.length }}</span>
        </div>
      </div>
      <div class="card-tools">
        <span v-if="overflow[i]" class="warn">⚠️ 内容超出，建议用 === 手动分页</span>
        <button class="btn" @click="exportOne(i)">⬇️ 下载第 {{ i + 1 }} 张</button>
      </div>
    </div>
    <p v-if="!pages.length" class="empty">输入内容后会在这里生成卡片</p>
  </div>
</template>
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { splitCards } from '../core/cards.js'
import { renderInline } from '../core/render.js'

const props = defineProps({ markdown: String, theme: String, cardStyle: String, author: String })
const S = computed(() => CARD_STYLES[props.cardStyle] || CARD_STYLES.fresh)
const split = computed(() => splitCards(props.markdown || ''))
const cards = computed(() => split.value.cards)
const pages = computed(() => [
  ...(split.value.cover ? [{ cover: split.value.cover }] : []),
  ...cards.value.map((md) => ({ html: renderInline(md, props.theme).replace(/color:#(2c3e50|222222|333333|1f2937)/g, `color:${S.value.text}`) })),
])
const cardStyleOf = (c) => ({ background: c.cover ? S.value.coverBg : S.value.bg, color: c.cover ? S.value.coverText : S.value.text })

const cardEls = ref([]), overflow = ref([])
watch([pages, S], async () => {
  await nextTick()
  overflow.value = cardEls.value.map((el) => { const ct = el.querySelector('.content'); return ct ? ct.scrollHeight > ct.clientHeight + 2 : false })
}, { immediate: true })

async function render(i) {
  const el = cardEls.value[i]
  return toPng(el, { pixelRatio: 1080 / el.offsetWidth, cacheBust: true })
}
function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; a.click() }
async function exportOne(i) {
  try { download(await render(i), `xhs-card-${String(i + 1).padStart(2, '0')}.png`) } catch (e) { alert('导出失败：' + (e?.message || '图片可能跨域，请使用支持跨域的图床')) }
}
async function exportAll() {
  try {
    const zip = new JSZip()
    for (let i = 0; i < pages.value.length; i++) zip.file(`xhs-card-${String(i + 1).padStart(2, '0')}.png`, (await render(i)).split(',')[1], { base64: true })
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob); download(url, 'xhs-cards.zip'); setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch (e) { alert('导出失败：' + (e?.message || '图片可能跨域')) }
}
defineExpose({ exportAll, pageCount: () => pages.value.length })
</script>
<style scoped>
.xhs { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
.card-wrap { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.card { width: min(360px, calc(100vw - 40px)); aspect-ratio: 3 / 4; border-radius: 18px; padding: 28px 26px 44px; position: relative; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,.1); font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
.content { height: 100%; overflow: hidden; font-size: 15px; }
.content :deep(h2) { font-size: 20px !important; margin-top: 0 !important; }
.content :deep(p:first-child), .content :deep(h3:first-child) { margin-top: 0 !important; }
.content :deep(pre) { font-size: 11.5px !important; }
.content :deep(table) { font-size: 12px !important; }
.cover-inner { height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.cover-badge { align-self: flex-start; padding: 4px 12px; border-radius: 999px; font-size: 13px; }
.cover-title { font-size: 34px; line-height: 1.3; margin: 0; font-weight: 800; letter-spacing: 1px; }
.cover-meta { font-size: 14px; opacity: .85; }
.foot { position: absolute; left: 26px; right: 26px; bottom: 16px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; }
.card-tools { display: flex; gap: 8px; align-items: center; }
.warn { color: #f59e0b; font-size: 12px; }
.empty { color: var(--muted); }
</style>
