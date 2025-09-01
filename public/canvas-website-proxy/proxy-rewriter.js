// ;(function () {
//   const proxyPrefix = '/api/proxy/website?url='
//   const baseUrl = new URL(document.currentScript.src, window.location.href).origin

//   function proxify(url) {
//     try {
//       if (!url.startsWith('http')) {
//         url = new URL(url, window.location.href).toString()
//       }
//       return proxyPrefix + encodeURIComponent(url)
//     } catch {
//       return url
//     }
//   }

//   // Patch fetch
//   const origFetch = window.fetch
//   window.fetch = function (input, init) {
//     let url = input instanceof Request ? input.url : input
//     return origFetch(proxify(url), init)
//   }

//   // Patch XHR
//   const origOpen = XMLHttpRequest.prototype.open
//   XMLHttpRequest.prototype.open = function (method, url, ...rest) {
//     arguments[1] = proxify(url)
//     return origOpen.apply(this, arguments)
//   }

//   // Intercept navigation (Next.js/SPA routing)
//   const origPush = history.pushState
//   history.pushState = function (...args) {
//     origPush.apply(this, args)
//     onNavigate()
//   }
//   const origReplace = history.replaceState
//   history.replaceState = function (...args) {
//     origReplace.apply(this, args)
//     onNavigate()
//   }
//   window.addEventListener('popstate', onNavigate)

//   // Rewrites <a> clicks so they stay proxied
//   document.addEventListener('click', (e) => {
//     const a = e.target.closest('a')
//     if (!a || !a.href) return
//     const abs = new URL(a.href, window.location.href).toString()
//     if (abs.startsWith(baseUrl)) return // skip local
//     e.preventDefault()
//     window.location.href = proxify(abs)
//   })

//   // MutationObserver: rewrite dynamically injected tags
//   const ATTRS = ['src', 'href', 'srcset', 'poster', 'action']
//   const observer = new MutationObserver((mutations) => {
//     mutations.forEach((m) => {
//       m.addedNodes.forEach((node) => {
//         if (node.nodeType === 1) {
//           ATTRS.forEach((attr) => {
//             if (node.hasAttribute?.(attr)) {
//               node.setAttribute(attr, proxify(node.getAttribute(attr)))
//             }
//           })
//         }
//       })
//     })
//   })
//   observer.observe(document.documentElement, { childList: true, subtree: true })

//   // Called on navigation
//   function onNavigate() {
//     // console.log('[Proxy] Navigation detected, re-injecting if needed.')
//     injectIfMissing()
//   }

//   function injectIfMissing() {
//     if (!document.querySelector('script[data-proxy-helper]')) {
//       const s = document.createElement('script')
//       s.dataset.proxyHelper = 'true'
//       s.src = '/canvas-website-proxy/proxy-rewriter.js'
//       document.head.appendChild(s)
//     }
//   }

//   // console.log('[Proxy] Proxy rewriter active')
// })()
