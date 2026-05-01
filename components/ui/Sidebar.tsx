"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useCallback, useEffect } from "react";

const NAV = [
  { href: "/leads",     label: "People & Leads", icon: "/icons/icon-leads.png"     },
  { href: "/funnel",    label: "Pipelines",       icon: "/icons/icon-pipelines.png" },
  { href: "/companies", label: "Companies",       icon: "/icons/icon-companies.png" },
  { href: "/documents", label: "Documents",       icon: "/icons/icon-documents.png" },
  { href: "/proposals", label: "Proposals",       icon: "/icons/icon-proposals.png" },
];

const MIN_WIDTH = 64;   // icons-only
const MAX_WIDTH = 285;  // fully expanded
const COLLAPSE_THRESHOLD = 140; // below this → icons only

export function Sidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(MAX_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(MAX_WIDTH);

  const collapsed = width < COLLAPSE_THRESHOLD;

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(next);
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Snap to either fully collapsed or fully expanded
      setWidth(prev => prev < COLLAPSE_THRESHOLD ? MIN_WIDTH : MAX_WIDTH);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <aside style={{
      width,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#ffffff",
      position: "relative",
      transition: dragging.current ? "none" : "width 0.2s ease",
      overflow: "hidden",
    }}>

      {/* Draggable divider */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: "absolute",
          right: 0,
          top: 100,
          bottom: 76,
          width: 6,
          cursor: "col-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Visible line */}
        <div style={{
          width: 1,
          height: "100%",
          background: "#e0e0e0",
          transition: "background 0.15s",
        }} />
      </div>

      {/* Logo */}
      <div style={{
        padding: collapsed ? "40px 0 0 0" : "40px 0 0 40px",
        display: "flex",
        justifyContent: collapsed ? "center" : "flex-start",
        transition: "padding 0.2s ease",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Ladies, Taylor"
          style={{
            width: collapsed ? 36 : 155,
            height: "auto",
            display: "block",
            imageRendering: "crisp-edges",
            transition: "width 0.2s ease",
            objectFit: "contain",
            objectPosition: "left center",
          }}
        />
      </div>

      {/* Nav */}
      <nav style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: collapsed ? "80px 6px 0 6px" : "80px 6px 0 12px",
        flex: 1,
        transition: "padding 0.2s ease",
      }}>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: collapsed ? 0 : 12,
                padding: collapsed ? "10px 0" : "10px 14px",
                borderRadius: 8,
                background: active ? "#FFB700" : "transparent",
                color: active ? "#ffffff" : "#252222",
                fontFamily: "'Satoshi', sans-serif",
                fontSize: 15,
                fontWeight: active ? 700 : 500,
                lineHeight: 1.2,
                textDecoration: "none",
                transition: "background 0.15s, padding 0.2s ease",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,183,0,0.1)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={icon}
                alt=""
                style={{
                  width: 20,
                  height: 20,
                  objectFit: "contain",
                  flexShrink: 0,
                  filter: active ? "brightness(0) invert(1)" : "none",
                }}
              />
              {!collapsed && (
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Junk link — above profile */}
      <div style={{ padding: collapsed ? "0 6px 8px 6px" : "0 6px 8px 12px" }}>
        <Link
          href="/junk"
          title={collapsed ? "Junk" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : 12,
            padding: collapsed ? "10px 0" : "10px 14px",
            borderRadius: 8,
            background: pathname === "/junk" ? "#FFB700" : "transparent",
            color: pathname === "/junk" ? "#ffffff" : "rgba(37,34,34,0.45)",
            textDecoration: "none",
            fontFamily: "'Satoshi', sans-serif",
            fontSize: 15,
            fontWeight: pathname === "/junk" ? 700 : 500,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/junk") (e.currentTarget as HTMLElement).style.background = "rgba(255,183,0,0.1)";
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/junk") (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-trash.svg"
            alt=""
            style={{
              width: 20, height: 20, objectFit: "contain", flexShrink: 0,
              filter: pathname === "/junk"
                ? "brightness(0) invert(1)"
                : "brightness(0) opacity(0.4)",
            }}
          />
          {!collapsed && <span>Junk</span>}
        </Link>
      </div>

      {/* Footer user */}
      <div style={{
        padding: collapsed ? "12px 0 20px 0" : "12px 16px 20px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : 10,
        transition: "padding 0.2s ease",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "#FFB700",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'Satoshi', sans-serif" }}>T</span>
        </div>
        {!collapsed && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#252222", fontFamily: "'Satoshi', sans-serif", margin: 0, lineHeight: 1.3 }}>
              Testing Kumar
            </p>
            <p style={{ fontSize: 11, color: "rgba(37,34,34,0.5)", fontFamily: "'Satoshi', sans-serif", margin: 0, lineHeight: 1.3 }}>
              Creative Lead
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
