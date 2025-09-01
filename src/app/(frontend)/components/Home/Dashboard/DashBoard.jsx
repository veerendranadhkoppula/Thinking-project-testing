"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import styles from "./DashBoard.module.css";
import Link from "next/link";
import Pagination from "./Pagination";
import { useLoading } from "@/app/context/LoadingContext"; 

const PAGE_SIZE = 5;

const DashBoard = ({ data, userData }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { setLoading } = useLoading(); 

  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder, filterCategory]);

  const filteredData = useMemo(() => {
    let filtered = [...data];
    if (filterCategory !== "all") {
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

  // ✅ paginate
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

        <div className={styles.filterWrapper} ref={filterRef}>
          <button
            className={styles.controlBtn}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            ☰ Filter
          </button>
          {filterOpen && (
            <div className={styles.filterDropdown}>
              <button onClick={() => setFilterCategory("all")}>All</button>
              <button onClick={() => setFilterCategory("Website")}>
                Website
              </button>
            </div>
          )}
        </div>

        <div className={styles.searchWrapper}>
          <button
            className={styles.searchIcon}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-search-icon lucide-search"
            >
              <path d="m21 21-4.34-4.34" />
              <circle cx="11" cy="11" r="8" />
            </svg>
          </button>
          <input
            type="text"
            className={`${styles.controlSearch} ${
              searchOpen ? styles.showSearch : ""
            }`}
            placeholder="Search canvases..."
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
              </Link>
              {item.isAdmin && (
                <Link
                  href={item.settingsHref}
                  onClick={() => setLoading(true)}
                >
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
