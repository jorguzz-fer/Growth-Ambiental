"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Calculator,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  HandCoins,
  FolderKanban,
  Users,
  Receipt,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { PermMatrix } from "@/lib/permissions";
import {
  activeModuleId,
  itemAtivoDoModulo,
  visibleMenu,
  type ModuleIcon,
} from "@/lib/nav-menu";
import { BrandMark } from "@/components/app/brand-mark";

const ICONS: Record<ModuleIcon, LucideIcon> = {
  bi: ChartColumn,
  planejamento: Calculator,
  receitas: HandCoins,
  despesas: Receipt,
  caixa: Wallet,
  obra: FolderKanban,
  pessoas: Users,
  config: Settings,
};

/**
 * Preferência de interface, por navegador (Prompt C §15): não toca tenant,
 * projeto nem versão, e não se mistura com os cookies de contexto.
 */
const COLLAPSED_KEY = "growth.sidebar.collapsed";

export interface SidebarProps {
  perms: PermMatrix;
  /** Drawer aberto em viewport pequena (estado do AppShell). */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ perms, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const menu = visibleMenu(perms);
  const current = activeModuleId(pathname, menu);

  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set(current ? [current] : []));

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* armazenamento indisponível: fica expandido */
    }
  }, []);

  // Ao navegar, o módulo da tela atual fica aberto; os que o usuário abriu
  // continuam como estão (sem "pulos").
  useEffect(() => {
    if (!current) return;
    setOpen((prev) => (prev.has(current) ? prev : new Set(prev).add(current)));
  }, [current]);

  // O subitem da tela atual fica à vista mesmo no fim de uma lista longa.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [pathname, collapsed]);

  // Esc fecha o drawer do celular.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, onCloseMobile]);

  const persistCollapsed = (v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
    } catch {
      /* ignora */
    }
  };

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Recolhida só no desktop; o drawer do celular sempre mostra os nomes.
  const rail = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden print:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-[var(--color-nav)] font-[family-name:var(--font-inter)] text-[var(--color-nav-text)] transition-[transform,width] duration-200 lg:static lg:translate-x-0 print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${rail ? "w-[76px] min-w-[76px]" : "w-[252px] min-w-[252px]"}`}
      >
        <div className={`flex items-center gap-[11px] ${rail ? "justify-center px-0 py-[22px]" : "px-5 pb-5 pt-[22px]"}`}>
          <BrandMark size={34} />
          {!rail && (
            <div>
              <div className="text-[19px] font-extrabold leading-none tracking-[0.2px] text-white">
                GROWTH
              </div>
              <div className="mt-1 text-[9.5px] tracking-[3.2px] text-[var(--color-brand-segmento)]">
                AMBIENTAL
              </div>
            </div>
          )}
        </div>

        {!rail && (
          <div className="px-5 pb-2.5 pt-1.5 text-[11px] tracking-[1.6px] text-[var(--color-nav-mut)]">
            MENU
          </div>
        )}

        <nav ref={navRef} className="flex-1 overflow-y-auto px-3 pb-3">
          {menu.map((m) => {
            const Icon = ICONS[m.icon];
            const isCurrent = m.id === current;
            const isOpen = open.has(m.id);
            const panelId = `nav-mod-${m.id}`;

            if (rail) {
              return (
                <button
                  key={m.id}
                  type="button"
                  title={m.label}
                  aria-label={m.label}
                  onClick={() => {
                    persistCollapsed(false);
                    setOpen((prev) => new Set(prev).add(m.id));
                  }}
                  className={`relative mb-0.5 flex h-11 w-full items-center justify-center rounded-[9px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brand-soft)] ${
                    isCurrent
                      ? "bg-[var(--color-nav-active)] text-white"
                      : "hover:bg-[var(--color-nav2)] hover:text-[#E8EEF8]"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -left-3 bottom-[9px] top-[9px] w-[3px] rounded-r-[3px] bg-[var(--color-brand-soft)]" />
                  )}
                  <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
                </button>
              );
            }

            return (
              <div key={m.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(m.id)}
                  className={`relative mb-0.5 flex w-full items-center gap-3 rounded-[9px] px-3 py-[11px] text-left text-[15.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brand-soft)] ${
                    isCurrent
                      ? "bg-[var(--color-nav-active)] font-semibold text-white"
                      : "font-medium hover:bg-[var(--color-nav2)] hover:text-[#E8EEF8]"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -left-3 bottom-[9px] top-[9px] w-[3px] rounded-r-[3px] bg-[var(--color-brand-soft)]" />
                  )}
                  <Icon className="h-[19px] w-[19px] flex-none opacity-90" strokeWidth={1.8} aria-hidden="true" />
                  <span className="flex-1">{m.label}</span>
                  {isOpen ? (
                    <ChevronUp className="h-[13px] w-[13px] opacity-60" strokeWidth={2.4} aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-[13px] w-[13px] opacity-60" strokeWidth={2.4} aria-hidden="true" />
                  )}
                </button>

                <div id={panelId} hidden={!isOpen} className="pb-1.5 pt-0.5">
                  {m.items.map((it) => {
                    const active = itemAtivoDoModulo(pathname, m.items) === it.href;
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={onCloseMobile}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center rounded-[8px] py-[9px] pl-[43px] pr-3 text-[14.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brand-soft)] ${
                          active
                            ? "bg-[var(--color-nav2)] font-semibold text-white"
                            : "text-[var(--color-nav-sub)] hover:bg-[var(--color-nav2)] hover:text-[#DCE5F2]"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-6 h-1.5 w-1.5 rounded-full bg-[var(--color-brand-soft)]" />
                        )}
                        <span className="flex-1">{it.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className={`hidden border-t border-white/[0.07] py-3.5 lg:block ${rail ? "px-0" : "px-[18px]"}`}>
          <button
            type="button"
            onClick={() => persistCollapsed(!collapsed)}
            title={rail ? "Expandir menu" : "Recolher menu"}
            aria-label={rail ? "Expandir menu" : "Recolher menu"}
            className={`flex items-center gap-2.5 rounded-[8px] text-[13.5px] text-[#8FA0BC] outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--color-brand-soft)] ${
              rail ? "mx-auto" : ""
            }`}
          >
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-white/[0.18]">
              {rail ? (
                <ChevronsRight className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronsLeft className="h-3 w-3" aria-hidden="true" />
              )}
            </span>
            {!rail && "Recolher menu"}
          </button>
        </div>
      </aside>
    </>
  );
}
