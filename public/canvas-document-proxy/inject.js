// console.log('[Inject.js] Script loaded inside proxied document!')

let isDrawing = false
let isLocked = false
let startX = 0
let startY = 0
let currentBox = null
let lastBox = null
let boxCounter = 0

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(name)
}

const isLatest = getQueryParam('latest') === '1'
let mode = getQueryParam('mode') || 'viewer'

if (!isLatest) {
  // console.log('[Inject.js] Not latest version → blocking annotations')
}

// Get the PDF page container under mouse
function getPageContainer(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.pdf-page')
  if (!el) return null
  return el
}

function createBox(x, y, width, height, container) {
  const box = document.createElement('div')
  box.style.position = 'absolute'
  box.style.left = `${x}px`
  box.style.top = `${y}px`
  box.style.width = `${width}px`
  box.style.height = `${height}px`
  box.style.border = '2px solid blue'
  box.style.backgroundColor = 'rgba(0,0,255,0.1)'
  box.style.zIndex = 9999
  box.style.pointerEvents = 'none'
  container.appendChild(box)
  lastBox = box
  return box
}

// Mouse down → start drawing
window.addEventListener('mousedown', (event) => {
  if (mode === 'viewer' || !isLatest || isLocked || event.button !== 0) return
  const pageContainer = getPageContainer(event.clientX, event.clientY)
  if (!pageContainer) return

  document.body.style.userSelect = 'none'
  isDrawing = true
  startX = event.clientX
  startY = event.clientY
  currentBox = createBox(0, 0, 0, 0, pageContainer)
  currentBox.dataset.pageIndex = pageContainer.dataset.pageNumber
})

// Mouse move → resize
window.addEventListener('mousemove', (event) => {
  if (!isDrawing || !currentBox) return
  const pageContainer = currentBox.parentElement
  const rect = pageContainer.getBoundingClientRect()

  const left = Math.min(event.clientX, startX) - rect.left
  const top = Math.min(event.clientY, startY) - rect.top
  const width = Math.abs(event.clientX - startX)
  const height = Math.abs(event.clientY - startY)

  currentBox.style.left = `${left}px`
  currentBox.style.top = `${top}px`
  currentBox.style.width = `${width}px`
  currentBox.style.height = `${height}px`
})

// Mouse up → finalize
window.addEventListener('mouseup', (event) => {
  if (!isDrawing || !currentBox || mode === 'viewer' || !isLatest) return
  document.body.style.userSelect = ''
  isDrawing = false

  const pageContainer = currentBox.parentElement
  const pageRect = pageContainer.getBoundingClientRect()
  const boxRect = currentBox.getBoundingClientRect()

  if (boxRect.width < 5 || boxRect.height < 5) {
    currentBox.remove()
    currentBox = null
    return
  }

  const pageIndex = parseInt(currentBox.dataset.pageIndex, 10)
  const boxId = `box-${Date.now()}-${++boxCounter}`
  isLocked = true

  window.parent.postMessage(
    {
      type: 'document-proxy-event',
      action: 'box-created',
      id: boxId,
      pageUrl: window.location.href,
      pageIndex,
      x: (boxRect.left - pageRect.left) / pageRect.width,
      y: (boxRect.top - pageRect.top) / pageRect.height,
      width: boxRect.width / pageRect.width,
      height: boxRect.height / pageRect.height,
      timestamp: Date.now(),
    },
    '*',
  )

  currentBox = null
})

// Draw annotation on specific page container
function drawAnnotation(thread) {
  const pageContainer = document.querySelector(`.pdf-page[data-page-number="${thread.pageIndex}"]`)
  if (!pageContainer) return

  const rect = pageContainer.getBoundingClientRect()
  const box = document.createElement('div')
  box.style.position = 'absolute'
  box.style.left = `${thread.x * rect.width}px`
  box.style.top = `${thread.y * rect.height}px`
  box.style.width = `${thread.width * rect.width}px`
  box.style.height = `${thread.height * rect.height}px`
  box.style.border = '2px solid red'
  box.style.backgroundColor = 'rgba(255,0,0,0.1)'
  box.style.zIndex = 9998
  box.style.pointerEvents = 'none'
  box.dataset.threadId = thread.id
  pageContainer.appendChild(box)
}

function clearAnnotations() {
  document.querySelectorAll('[data-thread-id]').forEach((el) => el.remove())
}

// Listen for parent messages
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'document-proxy-control') return
  const data = event.data

  switch (data.action) {
    case 'unlock-drawing':
      isLocked = false
      break
    case 'remove-last-box':
      if (lastBox) lastBox.remove()
      lastBox = null
      break
    case 'set-mode':
      mode = data.mode
      break
    case 'render-annotations':
    case 'add-annotations':
      clearAnnotations()
      data.threads?.forEach(drawAnnotation)
      break
    case 'delete-thread-by-id':
      const el = document.querySelector(`[data-thread-id="${data.threadId}"]`)
      if (el) el.remove()
      break
  }
})
