import { Check, Info, X } from "lucide-react";
import type { AccountNotice } from "../../utils/account-notice-state";
import "./account-notice.css";
export default function AccountNoticeCard({
  notice,
  onDismiss,
  onOpen,
}: {
  notice: AccountNotice;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const celebration = notice.kind === "GIFT";
  const positive = celebration || notice.kind === "SUCCESS";
  return (
    <aside
      className={`account-update-notice ${celebration ? "account-update-notice--gift" : positive ? "account-update-notice--success" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="account-update-icon" aria-hidden="true">
        {celebration ? (
          <>
            <svg
              className="account-gift-box"
              viewBox="0 0 32 32"
              width="25"
              height="25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 15v11h18V15M16 15v11" />
              <g className="account-gift-lid">
                <path d="M5 10h22v5H5zM16 10v5" />
                <path d="M16 10c-2-8-9-6-7-2 1 2 7 2 7 2Zm0 0c2-8 9-6 7-2-1 2-7 2-7 2Z" />
              </g>
            </svg>
            <span className="account-gift-check">
              <Check size={11} strokeWidth={3} />
            </span>
            <span className="account-gift-spark account-gift-spark--one" />
            <span className="account-gift-spark account-gift-spark--two" />
          </>
        ) : positive ? (
          <Check size={21} strokeWidth={2.5} />
        ) : (
          <Info size={20} />
        )}
      </span>
      <div>
        <strong>{notice.title}</strong>
        <p>{notice.body}</p>
        <button type="button" className="account-update-link" onClick={onOpen}>
          Profilde görüntüle
        </button>
      </div>
      <button
        type="button"
        className="account-update-close"
        aria-label="Hesap bildirimini kapat"
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </aside>
  );
}
