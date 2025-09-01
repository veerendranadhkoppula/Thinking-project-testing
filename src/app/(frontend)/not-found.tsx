import Link from 'next/link'
import styles from './not-found.module.css'

export default function NotFound() {
  return (
    <main className={styles.wrapper} role="main" aria-labelledby="nfTitle">
      <div className={styles.bg} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className={styles.card}>
        <div className={styles.badge}>404</div>
        <h1 id="nfTitle" className={styles.title}>
          Page not found
        </h1>
        <p className={styles.text}>The link might be broken or the page may have been removed.</p>

        <div className={styles.actions}>
          <Link className={styles.primary} href="/">
            Go to Home
          </Link>
          {/* <Link className={styles.secondary} href="/posts">Browse Posts</Link> */}
        </div>
      </section>
    </main>
  )
}
