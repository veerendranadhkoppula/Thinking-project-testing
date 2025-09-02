"use client";
import React, { useState, useMemo, useEffect } from "react";
import styles from "./DashBoard.module.css";
import Link from "next/link";
import Pagination from "./Pagination";
import { useLoading } from "@/app/context/LoadingContext";

const PAGE_SIZE = 5;

const DashBoard = ({ data, userData }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { setLoading } = useLoading();
// duumy ui for now later change 
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder, filterCategory]);

  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (filterCategory === "owned") {
      filtered = filtered.filter((item) => item.isAdmin);
    } else if (filterCategory === "shared") {
      filtered = filtered.filter((item) => item.isShared);
    } else if (filterCategory !== "all") {
      filtered = filtered.filter((item) => item.category === filterCategory);
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered = filtered.sort((a, b) =>
      sortOrder === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    );

    return filtered;
  }, [data, searchTerm, sortOrder, filterCategory]);


  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const clampedPage = Math.min(currentPage, totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filteredData.slice(start, end);

  const gotoPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardControls}>
        <button
          className={styles.controlBtn}
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? "↑ Sort Asc" : "↓ Sort Desc"}
        </button>

        <div className={styles.filterChips}>
          <button
            className={`${styles.chip} ${
              filterCategory === "all" ? styles.activeChip : ""
            }`}
            onClick={() => setFilterCategory("all")}
          >
            All
          </button>
          {/* <button
            className={`${styles.chip} ${
              filterCategory === "Website" ? styles.activeChip : ""
            }`}
            onClick={() => setFilterCategory("Website")}
          >
             Website
          </button> */}
          <button
            className={`${styles.chip} ${
              filterCategory === "owned" ? styles.activeChip : ""
            }`}
            onClick={() => setFilterCategory("owned")}
          >
            Owned
          </button>
          <button
            className={`${styles.chip} ${
              filterCategory === "shared" ? styles.activeChip : ""
            }`}
            onClick={() => setFilterCategory("shared")}
          >
             Shared
          </button>
        </div>

        <div className={styles.searchWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="🔍 Search canvases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.dashboardResults}>
        {pageItems.length > 0 ? (
          pageItems.map((item) => (
            <div className={styles.dashboardCard} key={item.id}>
              <Link
                href={item.href}
                className={styles.dashboardCardWrapper}
                onClick={() => setLoading(true)}
              >
                <h4>{item.title}</h4>
                <p>{item.category}</p>
                {item.isAdmin && <span className={styles.badge}>Owned</span>}
                {item.isShared && <span className={styles.badge}>Shared</span>}
              </Link>
              {item.isAdmin && (
                <Link href={item.settingsHref} onClick={() => setLoading(true)}>
                  <h4>Settings</h4>
                </Link>
              )}
            </div>
          ))
        ) : (
          <p className={styles.noResults}>No results found</p>
        )}
      </div>

      <Pagination
        totalItems={filteredData.length}
        pageSize={PAGE_SIZE}
        currentPage={clampedPage}
        onPageChange={gotoPage}
        showAlways={false}
      />
    </div>
  );
};

export default DashBoard;
