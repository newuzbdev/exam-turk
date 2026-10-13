import { Link } from "react-router";
import { CircleHelp, CreditCard, LogOut, User } from "lucide-react";

import { AccountAvatar } from "@/components/ui/account-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toApiUrl } from "@/config/runtime";
import { SUPPORT_TELEGRAM_URL } from "@/config/support";
import { cn } from "@/lib/utils";
import type { StudentOnboarding } from "@/pages/dashboard/onboarding-api";

interface StudentProfileMenuProps {
  user: {
    name?: string;
    username?: string;
    userName?: string;
    avatarUrl?: string;
    avatar?: string;
  } | null;
  profile?: Pick<StudentOnboarding, "targetLevel" | "examDate" | "targetExamYear"> | null;
  compact?: boolean;
  mobile?: boolean;
  onLogout: () => void;
}

export function StudentProfileMenu({
  user,
  profile,
  compact = false,
  mobile = false,
  onLogout,
}: StudentProfileMenuProps) {
  const displayName = [user?.name, user?.username, user?.userName]
    .find((value) => value?.trim())?.trim().replace(/\s+/g, " ") || "Kullanıcı";
  const words = displayName.split(" ");
  const initials = [words[0], ...(words.length > 1 ? [words[words.length - 1]] : [])]
    .map((word) => word[0].toLocaleUpperCase("tr-TR"))
    .join("");
  const avatar = user?.avatarUrl || user?.avatar;
  const examDate = profile?.examDate ? new Date(profile.examDate) : null;
  const examPeriod = examDate && Number.isFinite(examDate.getTime())
    ? new Intl.DateTimeFormat("tr-TR", {
        month: "long", year: "numeric", timeZone: "UTC",
      }).format(examDate)
    : profile?.targetExamYear ? String(profile.targetExamYear) : null;
  const target = profile?.targetLevel
    ? `Hedef ${profile.targetLevel}`
    : examPeriod ? "Sınav hedefi" : "Hedefinizi belirleyin";
  const targetLabel = [target, examPeriod].filter(Boolean).join(" · ");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Profil menüsü: ${displayName}`}
          title={compact ? `${displayName} · ${targetLabel}` : undefined}
          className={cn(
            "flex min-h-11 items-center gap-2.5 rounded-md text-left transition-colors hover:bg-[var(--tm-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-accent)] data-[state=open]:bg-[var(--tm-bg-hover)]",
            compact ? "w-11 justify-center" : "w-full px-2 py-1.5",
          )}
        >
          <AccountAvatar className="h-7 w-7" src={avatar ? toApiUrl(avatar) : undefined} alt="" initials={initials}
            fallbackClassName="bg-[var(--tm-bg-hover)] text-xs font-semibold text-[var(--tm-text-secondary)]" />
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium leading-5 text-[var(--tm-text-primary)]">
                {displayName}
              </span>
              <span className="block truncate text-[11px] leading-4 text-[var(--tm-text-tertiary)]">
                {targetLabel}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={mobile ? "bottom" : compact ? "right" : "top"}
        align={mobile ? "end" : "start"}
        sideOffset={8}
        collisionPadding={12}
        className="w-56 max-w-[calc(100vw-24px)] border-[var(--tm-border-subtle)] bg-white p-1.5 text-[var(--tm-text-primary)]"
      >
        <DropdownMenuLabel className="px-2 py-2 font-normal">
          <span className="block truncate text-[13px] font-medium">{displayName}</span>
          <span className="mt-0.5 block text-[11px] text-[var(--tm-text-tertiary)]">{targetLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--tm-border-subtle)]" />
        <DropdownMenuItem asChild className="min-h-10 gap-2.5 text-[13px] focus:bg-[var(--tm-bg-hover)]">
          <Link to="/app/profil">
            <User aria-hidden="true" />
            Profilim
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-10 gap-2.5 text-[13px] focus:bg-[var(--tm-bg-hover)]">
          <Link to="/app/fiyatlar#fiyatlandirma">
            <CreditCard aria-hidden="true" />
            Abonelik
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-10 gap-2.5 text-[13px] focus:bg-[var(--tm-bg-hover)]">
          <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            <CircleHelp aria-hidden="true" />
            Destek
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onLogout}
          className="min-h-10 gap-2.5 text-[13px] focus:bg-[var(--tm-bg-hover)]"
        >
          <LogOut aria-hidden="true" />
          Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
