// console.log('[Inject.js] Script loaded inside proxied page!')

let isDrawing = false
let isLocked = false // 🚨 lock while annotation modal is open
let startX = 0
let startY = 0
let currentBox = null
let lastBox = null
let boxCounter = 0
let isEditing = false

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search)

  // Outer proxy params
  if (params.has(name)) return params.get(name)

  // Inner target page params
  const proxiedUrl = params.get('url')
  if (proxiedUrl) {
    try {
      const innerParams = new URL(proxiedUrl).searchParams
      if (innerParams.has(name)) return innerParams.get(name)
    } catch {}
  }

  return null
}

const isLatest = getQueryParam('latest') === '1'
let mode = getQueryParam('mode') || 'viewer'

if (!isLatest) {
  // console.log('[Inject.js] Not latest version → blocking annotations')
}

function getCurrentIframeUrl() {
  return window.location.href
}

function createBox(x, y, width, height) {
  const box = document.createElement('div')
  box.style.position = 'absolute'
  box.style.left = `${x}px`
  box.style.top = `${y}px`
  box.style.width = `${width}px`
  box.style.height = `${height}px`
  box.style.border = '2px solid blue'
  box.style.backgroundColor = 'rgba(0, 0, 255, 0.1)'
  box.style.zIndex = 9999
  box.style.pointerEvents = 'none'
  document.body.appendChild(box)
  lastBox = box
  return box
}

// Mouse down → start drawing
window.addEventListener('mousedown', (event) => {
  if (mode === 'viewer') return
  if (!isLatest) return
  if (isLocked) return
  if (isEditing) return
  if (event.button !== 0) return
  document.body.style.userSelect = 'none'
  isDrawing = true
  startX = event.pageX
  startY = event.pageY
  currentBox = createBox(startX, startY, 0, 0)
})

// Mouse move → resize
window.addEventListener('mousemove', (event) => {
  if (!isDrawing || !currentBox) return
  const currentX = event.pageX
  const currentY = event.pageY
  const width = Math.abs(currentX - startX)
  const height = Math.abs(currentY - startY)
  const left = Math.min(currentX, startX)
  const top = Math.min(currentY, startY)
  currentBox.style.left = `${left}px`
  currentBox.style.top = `${top}px`
  currentBox.style.width = `${width}px`
  currentBox.style.height = `${height}px`
})

// Mouse up → finalize
// Mouse up → finalize
window.addEventListener('mouseup', (event) => {
  if (!isDrawing) return
  if (mode === 'viewer') return
  if (!isLatest) return
  if (isEditing) return
  document.body.style.userSelect = ''
  isDrawing = false

  const rect = currentBox.getBoundingClientRect()
  if (rect.width < 5 || rect.height < 5) {
    currentBox.remove()
    currentBox = null
    return
  }

  const boxId = `box-${Date.now()}-${++boxCounter}`
  isLocked = true

  const pageWidth = document.documentElement.scrollWidth
  const pageHeight = document.documentElement.scrollHeight

  window.parent.postMessage(
    {
      type: 'website-proxy-event',
      action: 'box-created',
      id: boxId,
      pageUrl: getCurrentIframeUrl(),
      x: (rect.left + window.scrollX) / pageWidth,
      y: (rect.top + window.scrollY) / pageHeight,
      width: rect.width / pageWidth,
      height: rect.height / pageHeight,
      scrollX: window.scrollX / pageWidth,
      scrollY: window.scrollY / pageHeight,
      timestamp: Date.now(),
    },
    '*',
  )

  currentBox = null
})

function applyEditedText(selector, newText, retries = 10, delay = 50) {
  if (!selector || !newText) return
  let attempt = 0

  function tryApply() {
    const el = document.querySelector(selector)
    if (el) {
      if (el.innerText.trim() !== newText.trim()) {
        el.innerText = newText
      }
      return
    }
    attempt++
    if (attempt < retries) {
      setTimeout(tryApply, delay)
    } else {
      console.warn('[Inject.js] Failed to find selector for edited text:', selector)
    }
  }

  tryApply()
}

function drawAnnotation(thread) {
  const pageWidth = document.documentElement.scrollWidth
  const pageHeight = document.documentElement.scrollHeight
  const box = document.createElement('div')
  const lastComment = thread.comments?.[thread.comments.length - 1]
  // console.log(
  //   'Asked to Change Comment Text',
  //   lastComment?.['text-edited'],
  //   lastComment['text-edit']?.selector,
  //   !lastComment.deleted,
  // )
  if (lastComment?.['text-edited'] && lastComment['text-edit']?.selector && !lastComment.deleted) {
    applyEditedText(lastComment['text-edit'].selector, lastComment['text-edit'].newText)
  }

  box.style.position = 'absolute'
  // ✅ scale back from saved fractions of full page size
  box.style.left = `${thread.x * pageWidth}px`
  box.style.top = `${thread.y * pageHeight}px`
  box.style.width = `${thread.width * pageWidth}px`
  box.style.height = `${thread.height * pageHeight}px`
  box.style.border = '2px solid red'
  box.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'
  box.style.zIndex = 9998
  box.style.pointerEvents = 'none'
  box.dataset.threadId = thread.id

  document.body.appendChild(box)
}

function clearAnnotations() {
  document.querySelectorAll('[data-thread-id]').forEach((el) => el.remove())
}

window.addEventListener('message', (event) => {
  if (event.data?.type === 'website-proxy-control') {
    if (event.data.action === 'highlight-thread') {
      const { threadId } = event.data
      // console.log('[Inject.js] Highlight request for thread', threadId)

      const el = document.querySelector(`[data-thread-id="${threadId}"]`)
      if (el) {
        // scroll into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // temporary highlight effect
        el.style.outline = '3px solid orange'
        el.style.transition = 'outline 0.5s ease-in-out'

        setTimeout(() => {
          el.style.outline = 'none'
        }, 2000)
      }
    }

    if (event.data.action === 'render-annotations') {
      // console.log('[Inject.js] Rendering annotations ', event.data.threads)
      // console.log('[Inject.js] Current Viewport ', event.data.currentViewport)
      const currentViewport = event.data.currentViewport || null

      // 🧹 clear old
      clearAnnotations()
      // 🎯 draw only matching viewport threads
      event.data.threads
        .filter((thread) => {
          return !currentViewport || thread.viewport === currentViewport
        })
        .forEach((thread) => {
          // console.log('[Inject.js] Drawing annotation →', thread.id, thread)
          drawAnnotation(thread)
        })
    }

    if (event.data.action === 'add-annotations') {
      // console.log('[Inject.js] Adding annotations', event.data.threads)
      const currentViewport = event.data.currentViewport || null
      // 🎯 draw only matching viewport threads
      event.data.threads
        .filter((thread) => !currentViewport || thread.viewport === currentViewport)
        .forEach(drawAnnotation)
    }

    if (event.data.action === 'unlock-drawing') {
      isLocked = false
    }

    if (event.data.action === 'remove-last-box') {
      if (lastBox) {
        lastBox.remove()
        lastBox = null
      }
    }

    if (event.data.action === 'delete-thread-by-id') {
      const { threadId } = event.data
      // console.log(`[Inject.js] Removing annotation thread with id: ${threadId}`)
      const el = document.querySelector(`[data-thread-id="${threadId}"]`)
      if (el) el.remove()
    }

    if (event.data.action === 'set-mode') {
      mode = event.data.mode
      // console.log(`[Inject.js] Mode switched → ${mode}`)
    }
  }
})

const EDIT_HIGHLIGHT_CLASS = 'editing-highlight'
const PERMANENT_HIGHLIGHT_CLASS = 'annotation-highlight'

// Add styles for highlights
const style = document.createElement('style')
style.textContent = `
  .${EDIT_HIGHLIGHT_CLASS} {
    outline: 2px dashed #facc15; /* active editing */
    background-color: rgba(250, 204, 21, 0.15);
  }
  .${PERMANENT_HIGHLIGHT_CLASS} {
    outline: 2px dashed #facc15; /* permanent annotation */
    background-color: rgba(250, 204, 21, 0.08);
  }
`
document.head.appendChild(style)

window.addEventListener('contextmenu', (event) => {
  if (mode === 'viewer' || !isLatest || isEditing) return

  const el = event.target

  // Only allow editing for text elements (ignore inputs, buttons etc.)
  if (el.nodeType === 1 && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
    event.preventDefault()

    const prevText = el.innerText
    el.setAttribute('contenteditable', 'true')
    el.classList.add(EDIT_HIGHLIGHT_CLASS)
    el.focus()
    isEditing = true

    const saveEdit = () => {
      el.removeAttribute('contenteditable')
      el.classList.remove(EDIT_HIGHLIGHT_CLASS)
      isEditing = false

      const newText = el.innerText.trim()
      const oldTextTrimmed = prevText.trim()

      // ✅ Only proceed if text was actually edited
      if (newText !== oldTextTrimmed) {
        el.classList.add(PERMANENT_HIGHLIGHT_CLASS) // keep annotation highlight

        const rect = el.getBoundingClientRect()
        const pageWidth = document.documentElement.scrollWidth
        const pageHeight = document.documentElement.scrollHeight
        const pingData = {
          x: (rect.left + window.scrollX) / pageWidth,
          y: (rect.top + window.scrollY) / pageHeight,
          width: rect.width / pageWidth,
          height: rect.height / pageHeight,
          scrollX: window.scrollX / pageWidth,
          scrollY: window.scrollY / pageHeight,
        }

        const commentPayload = {
          'comment-id': `text-${Date.now()}`,
          date: new Date().toISOString(),
          edited: false,
          editedAt: null,
          deleted: false,
          commentType: 'task',
          commentStatus: 'active',
          'text-edited': true,
          'text-edit': {
            selector: getUniqueSelector(el),
            oldText: oldTextTrimmed,
            newText: newText,
          },
          ping: pingData,
          message: `Edited text: ${newText}`,
        }

        window.parent.postMessage(
          {
            type: 'website-proxy-event',
            action: 'text-edited',
            data: commentPayload,
            pageUrl: getCurrentIframeUrl(),
            timestamp: Date.now(),
          },
          '*',
        )
      } else {
        el.innerText = prevText
      }

      cleanup()
    }

    const cancelEdit = () => {
      el.innerText = prevText
      el.removeAttribute('contenteditable')
      el.classList.remove(EDIT_HIGHLIGHT_CLASS)
      isEditing = false
      cleanup()
    }

    const handleKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        saveEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelEdit()
      }

      // 🔒 Block shortcuts while editing
      if (isEditing && (e.ctrlKey || e.metaKey)) {
        const blocked = ['s', 'r', 'f', 'p', 'w']
        if (blocked.includes(e.key.toLowerCase())) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
    }

    const cleanup = () => {
      el.removeEventListener('blur', saveEdit)
      el.removeEventListener('keydown', handleKey)
    }

    el.addEventListener('blur', saveEdit)
    el.addEventListener('keydown', handleKey)
  }
})

// Helper to uniquely identify elements
function getUniqueSelector(el) {
  if (!(el instanceof Element)) return null

  const parts = []
  let current = el

  while (current && current.nodeType === 1 && current.tagName.toLowerCase() !== 'html') {
    let selector = current.tagName.toLowerCase()

    // Prefer ID if unique
    if (current.id) {
      const sameId = document.querySelectorAll(`#${CSS.escape(current.id)}`)
      if (sameId.length === 1) {
        selector = `#${CSS.escape(current.id)}`
        parts.unshift(selector)
        break // Unique! stop climbing
      } else {
        const idx = Array.from(sameId).indexOf(current) + 1
        selector = `#${CSS.escape(current.id)}:nth-of-type(${idx})`
      }
    } else {
      // Use classes if available
      let classes = (current.className || '')
        .trim()
        .split(/\s+/)
        .filter((c) => c.length > 0 && !['annotation-highlight', 'editing-highlight'].includes(c))

      if (classes.length > 0) {
        selector += '.' + classes.map((c) => CSS.escape(c)).join('.')
      }

      // If not unique among siblings → add nth-of-type
      let siblings = []
      try {
        siblings = current.parentNode ? current.parentNode.querySelectorAll(selector) : []
      } catch (e) {
        console.warn('Invalid selector built:', selector, e)
      }

      if (siblings.length > 1) {
        const idx = Array.from(siblings).indexOf(current) + 1
        selector += `:nth-of-type(${idx})`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(' > ')
}

;(function monitorUrlChanges() {
  let lastUrl = location.href

  function notify() {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      window.parent.postMessage(
        {
          type: 'website-proxy-event',
          action: 'page-changed',
          pageUrl: location.href,
        },
        '*',
      )
    }
  }

  // ✅ Force initial notify so parent gets first page
  window.parent.postMessage(
    {
      type: 'website-proxy-event',
      action: 'page-changed',
      pageUrl: location.href,
    },
    '*',
  )

  // Wrap history APIs
  const pushState = history.pushState
  history.pushState = function () {
    pushState.apply(this, arguments)
    notify()
  }

  const replaceState = history.replaceState
  history.replaceState = function () {
    replaceState.apply(this, arguments)
    notify()
  }

  window.addEventListener('popstate', notify)
  setInterval(notify, 100)
})()
