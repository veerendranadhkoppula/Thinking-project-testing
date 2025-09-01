"use client";
import React from "react";
import styles from "./Pagination.module.css";

export default function Pagination({
  totalItems,
  pageSize = 5,
  currentPage,
  onPageChange,
  showAlways = false,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (!showAlways && totalPages <= 1) return null;

  const clamp = (p) => Math.min(Math.max(p, 1), totalPages);

  const buildPageNumbers = () => {
    const pages = [];
    const maxShown = 5;
    let startP = Math.max(1, currentPage - 2);
    let endP = Math.min(totalPages, startP + maxShown - 1);
    startP = Math.max(1, endP - maxShown + 1);

    if (startP > 1) pages.push(1, "left-ellipsis");
    for (let p = startP; p <= endP; p++) pages.push(p);
    if (endP < totalPages) pages.push("right-ellipsis", totalPages);

    return pages;
  };

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        className={styles.pageBtn}
        onClick={() => onPageChange(clamp(currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ←
      </button>

      {buildPageNumbers().map((p, idx) =>
        typeof p === "number" ? (
          <button
            key={`p-${p}-${idx}`}
            className={`${styles.pageNumber} ${
              currentPage === p ? styles.activePage : ""
            }`}
            onClick={() => onPageChange(p)}
            aria-current={currentPage === p ? "page" : undefined}
          >
            {p}
          </button>
        ) : (
          <span key={`${p}-${idx}`} className={styles.ellipsis}>
            …
          </span>
        )
      )}

      <button
        className={styles.pageBtn}
        onClick={() => onPageChange(clamp(currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        →
      </button>
    </nav>
  );
}
