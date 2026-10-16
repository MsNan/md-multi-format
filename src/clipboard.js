/** 复制富文本（同时写入 text/html 和 text/plain），不支持时退回到选区复制 */
export async function copyRich(html, plain) {
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })])
      return true
    }
  } catch { /* 继续走降级方案 */ }
  const div = document.createElement('div')
  div.innerHTML = html
  Object.assign(div.style, { position: 'fixed', left: '-9999px', top: '0' })
  document.body.appendChild(div)
  const range = document.createRange(); range.selectNodeContents(div)
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range)
  let ok = false; try { ok = document.execCommand('copy') } catch {}
  sel.removeAllRanges(); div.remove()
  return ok
}
export async function copyPlain(text) {
  try { await navigator.clipboard.writeText(text); return true } catch {
    const ta = document.createElement('textarea'); ta.value = text; Object.assign(ta.style, { position: 'fixed', opacity: '0' })
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy') } catch {}
    ta.remove(); return ok
  }
}
