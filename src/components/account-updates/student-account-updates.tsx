import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getOwnAccountUpdates } from "@/services/accountUpdates.service";
import {
  accountNoticeState,
  type AccountNotice,
} from "@/utils/account-notice-state";
import AccountNoticeCard from "./account-notice";
export default function StudentAccountUpdates({
  userId,
  enabled,
}: {
  userId?: string;
  enabled: boolean;
}) {
  return userId ? (
    <OwnedAccountUpdates key={userId} userId={userId} enabled={enabled} />
  ) : null;
}
function OwnedAccountUpdates({
  userId,
  enabled,
}: {
  userId: string;
  enabled: boolean;
}) {
  const [notice, setNotice] = useState<AccountNotice | null>(null),
    [visible, setVisible] = useState(
      () => document.visibilityState !== "hidden",
    );
  const [state] = useState(() => accountNoticeState(userId, localStorage));
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled) return;
    let stopped = false,
      flight: AbortController | undefined;
    const owner = () => sessionStorage.getItem("userId") === userId;
    async function check() {
      if (
        stopped ||
        flight ||
        !owner() ||
        document.visibilityState === "hidden"
      )
        return;
      const controller = new AbortController();
      flight = controller;
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      try {
        const items = await getOwnAccountUpdates(userId, controller.signal);
        if (!stopped && !controller.signal.aborted && owner())
          setNotice(state.next(items));
      } catch {
        /* Silent read failure never interrupts a lesson or signs the user out. */
      } finally {
        window.clearTimeout(timeout);
        if (flight === controller) flight = undefined;
      }
    }
    const visibility = () => {
      setVisible(document.visibilityState !== "hidden");
      if (document.visibilityState !== "hidden") void check();
    };
    const changed = () => void check();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("access:allowance-changed", changed);
    const timer = window.setInterval(changed, 30000);
    void check();
    return () => {
      stopped = true;
      flight?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("access:allowance-changed", changed);
    };
  }, [userId, enabled, state]);
  if (
    !enabled ||
    !visible ||
    !notice ||
    sessionStorage.getItem("userId") !== userId
  )
    return null;
  const dismiss = () => {
    state.dismiss(notice.id);
    setNotice(null);
  };
  return (
    <AccountNoticeCard
      key={notice.id}
      notice={notice}
      onDismiss={dismiss}
      onOpen={() => {
        dismiss();
        navigate("/app/profil");
      }}
    />
  );
}
