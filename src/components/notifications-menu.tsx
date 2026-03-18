"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type NavNotificationItem = {
  id: string;
  kind: "general" | "matchday_points" | "result_update" | "admin_broadcast";
  title: string;
  body: string;
  ctaHref: string | null;
  createdAtLabel: string;
  isRead: boolean;
};

type NotificationsMenuProps = {
  items: NavNotificationItem[];
  unreadCount: number;
};

function kindLabel(kind: NavNotificationItem["kind"]) {
  switch (kind) {
    case "matchday_points":
      return "Puntos";
    case "result_update":
      return "Resultado";
    case "admin_broadcast":
      return "Admin";
    default:
      return "Info";
  }
}

export function NotificationsMenu({ items, unreadCount }: NotificationsMenuProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isMarkingId, setIsMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  function calculatePanelStyle() {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") {
      return null;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(370, Math.max(280, window.innerWidth - viewportPadding * 2));
    const left = Math.min(
      Math.max(viewportPadding, rect.right - width),
      window.innerWidth - width - viewportPadding,
    );
    const top = rect.bottom + 8;

    return { top, left, width };
  }

  function handleToggleMenu() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const nextStyle = calculatePanelStyle();
    if (nextStyle) {
      setPanelStyle(nextStyle);
    }
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePosition() {
      const nextStyle = calculatePanelStyle();
      if (nextStyle) {
        setPanelStyle(nextStyle);
      }
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  async function markAllAsRead() {
    setError(null);
    setIsMarkingAll(true);

    const response = await fetch("/api/notifications/read", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const payload = await response.json();
    setIsMarkingAll(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo marcar como leidas.");
      return;
    }

    router.refresh();
  }

  async function markOneAsRead(notificationId: string) {
    setError(null);
    setIsMarkingId(notificationId);

    const response = await fetch("/api/notifications/read", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    const payload = await response.json();
    setIsMarkingId(null);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo actualizar la notificacion.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggleMenu}
        className="nav-item relative px-3 py-2 text-xs"
        aria-label="Avisos"
      >
        Avisos
        {unreadCount > 0 ? (
          <span className="absolute -right-2 -top-2 rounded-full border-2 border-[#1d2430] bg-[#ffd447] px-1.5 text-[10px] font-black text-[#1d2430]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen && panelStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="panel panel-popover fixed z-[120] p-3"
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#1f2937]">Notificaciones</p>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={isMarkingAll || unreadCount === 0}
                  className="btn-ghost px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMarkingAll ? "Marcando..." : "Marcar todas"}
                </button>
              </div>

              {error ? <p className="alert-error mt-2 rounded-lg p-2 text-xs">{error}</p> : null}

              <div className="mt-2 max-h-[360px] space-y-2 overflow-auto pr-1">
                {items.length === 0 ? (
                  <p className="panel-soft p-3 text-xs text-[#6b7280]">No tenes notificaciones por ahora.</p>
                ) : (
                  items.map((item) => {
                    const unread = !item.isRead;
                    const actionLabel = isMarkingId === item.id ? "..." : unread ? "Marcar leida" : "Abrir";

                    return (
                      <article key={item.id} className={`panel-soft p-2.5 ${unread ? "fixture-x2-active" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[#1f2937]">{item.title}</p>
                            <p className="mt-0.5 text-[11px] text-[#5d6778]">{item.body}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wide text-[#6b7280]">
                              {kindLabel(item.kind)} | {item.createdAtLabel}
                            </p>
                          </div>
                          {unread ? <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#9a6b00]" /> : null}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => markOneAsRead(item.id)}
                            disabled={isMarkingId === item.id}
                            className="btn-ghost px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLabel}
                          </button>
                          {item.ctaHref ? (
                            <Link
                              href={item.ctaHref}
                              onClick={() => {
                                if (unread) {
                                  void markOneAsRead(item.id);
                                }
                                setIsOpen(false);
                              }}
                              className="link-inline text-[11px]"
                            >
                              Ir
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
