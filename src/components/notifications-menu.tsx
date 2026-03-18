"use client";

import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isMarkingId, setIsMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
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

      {isOpen ? (
        <div className="panel panel-popover absolute right-0 z-50 mt-2 w-[min(94vw,370px)] p-3">
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
              <p className="panel-soft p-3 text-xs text-[#6b7280]">No tenés notificaciones por ahora.</p>
            ) : (
              items.map((item) => {
                const unread = !item.isRead;
                const actionLabel = isMarkingId === item.id ? "..." : unread ? "Marcar leída" : "Abrir";

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
                      {unread ? (
                        <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#9a6b00]" />
                      ) : null}
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
        </div>
      ) : null}
    </div>
  );
}
