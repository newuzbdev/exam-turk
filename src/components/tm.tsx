import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

export const tm = {
  page: "bg-[var(--tm-bg-page)] text-[var(--tm-text-primary)] font-sans",
  container: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
  section: "bg-[var(--tm-bg-page)] py-12 sm:py-16",
  surface:
    "rounded-[var(--tm-radius-lg)] border border-[var(--tm-border-subtle)] bg-[var(--tm-bg-surface)] shadow-[var(--tm-shadow-card)]",
  hoverSurface: "transition-colors duration-200 hover:bg-[var(--tm-bg-hover)]",
  navItem:
    "rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors duration-200 text-[var(--tm-text-secondary)] hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)] lg:text-sm",
  navItemActive:
    "bg-[var(--tm-bg-active)] text-[var(--tm-text-primary)]",
  primaryButton:
    "theme-important rounded-md bg-[var(--tm-accent)] text-white shadow-none transition-colors hover:bg-[var(--tm-accent-hover)]",
  subtleButton:
    "rounded-md border border-[var(--tm-border-default)] bg-white text-[var(--tm-text-primary)] shadow-none transition-colors hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]",
  muted: "text-[var(--tm-text-secondary)]",
  label:
    "text-xs font-medium uppercase tracking-[0.12em] text-[var(--tm-text-secondary)]",
  h1: "text-3xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-5xl",
  h2: "text-2xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-3xl",
  body: "text-sm leading-6 text-[var(--tm-text-secondary)] sm:text-base sm:leading-7",
  // Notion pastel "student panel" dili — dashboard ile ortak.
  card:
    "rounded-[12px] border border-[var(--tm-border-subtle)] bg-white shadow-[var(--tm-shadow-card)]",
  darkButton:
    "inline-flex items-center justify-center gap-2 rounded-[8px] bg-[var(--tm-ink-strong)] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
};

// Notion pastel kategori paleti (beceri & durum sinyalleri).
export type TmCategory =
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "goal";

export const categoryStyle = (key: TmCategory) => ({
  background: `var(--tm-cat-${key}-bg)`,
  color: `var(--tm-cat-${key}-fg)`,
});

/** Dashboard ile aynı yerleşim: app zemini, 1120px kap, üstte sade başlık. */
export function StudentPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--tm-bg-app)] font-sans text-[var(--tm-text-primary)]">
      <div className="mx-auto max-w-[1120px] px-5 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="text-[12px] font-semibold text-[var(--tm-text-tertiary)]">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.02em]">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-[15px] text-[var(--tm-text-secondary)]">
                {description}
              </p>
            )}
          </div>
          {actions}
        </div>
        <div className="mt-7">{children}</div>
      </div>
    </main>
  );
}

export function SectionHeader({
  label,
  title,
  description,
  align = "left",
}: {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-8 max-w-3xl",
        align === "center" && "mx-auto text-center",
      )}
    >
      {label && <p className={cn(tm.label, "mb-2")}>{label}</p>}
      <h2 className={tm.h2}>{title}</h2>
      {description && <p className={cn(tm.body, "mt-3")}>{description}</p>}
    </div>
  );
}

export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(tm.surface, className)} {...props} />;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn("border-b border-[var(--tm-border-subtle)] bg-white", className)}>
      <div className={cn(tm.container, "py-9 sm:py-12")}>
        <div className="max-w-3xl">
          {eyebrow && <p className={cn(tm.label, "mb-2")}>{eyebrow}</p>}
          <h1 className={tm.h1}>{title}</h1>
          {description && <p className={cn(tm.body, "mt-4 max-w-2xl")}>{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function FeatureRow({
  icon: Icon,
  title,
  description,
  meta,
  className,
}: {
  icon: IconType;
  title: string;
  description: string;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 px-4 py-4 sm:grid-cols-[20px_1fr_auto] sm:items-start sm:px-5",
        tm.hoverSurface,
        className,
      )}
    >
      <Icon
        className="mt-0.5 h-4 w-4 text-[var(--tm-text-secondary)]"
        strokeWidth={2.15}
      />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--tm-text-primary)]">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-[var(--tm-text-secondary)]">
          {description}
        </p>
      </div>
      {meta && (
        <div className="text-xs font-medium text-[var(--tm-text-tertiary)]">
          {meta}
        </div>
      )}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "accent";
}) {
  const toneClass = {
    neutral:
      "bg-[var(--tm-bg-muted)] text-[var(--tm-text-secondary)]",
    success: "bg-[#edf7f1] text-[#1f7a4d]",
    accent: "bg-red-50 text-[var(--tm-accent)]",
  }[tone];

  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", toneClass)}>
      {children}
    </span>
  );
}
