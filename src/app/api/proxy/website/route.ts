// app/api/proxy/website/route.ts
import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const latest = req.nextUrl.searchParams.get('latest') === '1'
  // console.log(
  //   `==================IS LATEST = ${req.nextUrl.searchParams.get('latest')} ====================`,
  // )
  if (!url || !url.startsWith('http')) {
    return new Response('Invalid URL', { status: 400 })
  }

  const res = await fetch(url)
  const contentType = res.headers.get('content-type') || ''

  // Non-HTML -> stream back directly
  if (!contentType.includes('text/html') && !contentType.includes('text/css')) {
    const buffer = await res.arrayBuffer()
    return new Response(buffer, {
      headers: { 'Content-Type': contentType },
    })
  }

  // CSS handling
  if (contentType.includes('text/css')) {
    let css = await res.text()
    css = css.replace(/url\(["']?([^"')]+)["']?\)/g, (_, path) => {
      try {
        const absoluteUrl = new URL(path, url).toString()
        return `url("/api/proxy/website?url=${encodeURIComponent(absoluteUrl)}${latest ? '&latest=1' : ''}")`
      } catch {
        return `url(${path})`
      }
    })

    return new Response(css, {
      headers: { 'Content-Type': 'text/css' },
    })
  }

  // HTML handling
  const html = await res.text()
  const $ = cheerio.load(html)

  // Remove CSP + <base> which breaks relative rewrites
  $('meta[http-equiv="Content-Security-Policy"]').remove()
  $('base').remove()

  // Attributes to rewrite
  const ATTRS = ['src', 'href', 'srcset', 'data-src', 'data-lazy-src', 'poster', 'action']

  $('a, img, script, link, source, video, audio, iframe, form').each((_, el) => {
    ATTRS.forEach((attr) => {
      const val = $(el).attr(attr)
      if (!val) return
      try {
        if (attr === 'srcset') {
          const rewritten = val
            .split(',')
            .map((part) => {
              const [u, size] = part.trim().split(/\s+/, 2)
              try {
                const abs = new URL(u, url).toString()
                return `/api/proxy/website?url=${encodeURIComponent(abs)}${latest ? '&latest=1' : ''}${size ? ' ' + size : ''}`
              } catch {
                return part
              }
            })
            .join(', ')
          $(el).attr(attr, rewritten)
        } else {
          const resolvedUrl = new URL(val, url).toString()
          $(el).attr(
            attr,
            `/api/proxy/website?url=${encodeURIComponent(resolvedUrl)}${latest ? '&latest=1' : ''}`,
          )
        }
      } catch {}
    })
  })

  // Inline <style> CSS url() rewriting
  $('style').each((_, el) => {
    let css = $(el).html()
    if (!css) return
    css = css.replace(/url\(["']?([^"')]+)["']?\)/g, (_, path) => {
      try {
        const absoluteUrl = new URL(path, url).toString()
        return `url("/api/proxy/website?url=${encodeURIComponent(absoluteUrl)}${latest ? '&latest=1' : ''}")`
      } catch {
        return `url(${path})`
      }
    })
    $(el).html(css)
  })

  // Rewrite inline <script> contents for WP ajax/rest URLs
  $('script').each((_, el) => {
    let js = $(el).html()
    if (!js) return

    // Replace ajaxurl references
    js = js.replace(
      /["']\/wp-admin\/admin-ajax\.php["']/g,
      `"${`/api/proxy/website?url=${encodeURIComponent(new URL('/wp-admin/admin-ajax.php', url).toString())}${latest ? '&latest=1' : ''}`}"`,
    )

    // Replace REST API calls
    js = js.replace(/["']\/wp-json\/[^"']*["']/g, (match) => {
      const clean = match.slice(1, -1) // remove quotes
      try {
        const abs = new URL(clean, url).toString()
        return `"${`/api/proxy/website?url=${encodeURIComponent(abs)}${latest ? '&latest=1' : ''}`}"`
      } catch {
        return match
      }
    })

    $(el).html(js)
  })

  const loaderScript = `
  <script>
  (function ensureDraggable() {
    function inject() {
      if (!document.querySelector('script[src="/canvas-website-proxy/draggable-boxes.js"]')) {
        var s = document.createElement('script');
        s.src = '/canvas-website-proxy/draggable-boxes.js';
        s.async = false;
        document.head.appendChild(s);
      }
    }
    // Initial load
    inject();
    // Observe DOM for SPA/AJAX changes
    const obs = new MutationObserver(inject);
    obs.observe(document.documentElement, { childList: true, subtree: true });
  })();
  </script>
  `

  if ($('head').length > 0) {
    $('head').append(loaderScript)
  } else if ($('body').length > 0) {
    $('body').append(loaderScript)
  } else {
    $.root().append(`<head>${loaderScript}</head>`)
  }

  return new Response($.html(), {
    headers: { 'Content-Type': 'text/html' },
  })
}
