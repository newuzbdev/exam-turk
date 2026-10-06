import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  History,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AiPanelAction = {
  label: string;
  prompt: string;
  mode: AiPanelActionMode;
  action?: AiPanelActionMode;
};

type AiPanelMessage = {
  id: string;
  from: "user" | "assistant" | "error";
  text: string;
};

type AiPanelConversation = {
  id: string;
  title: string | null;
  lastMessageAt: string | null;
  createdAt: string;
};

type AiPanelStoredMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string | null;
  createdAt: string;
};

export type AiPanelActionMode =
  | "LESSON_EXPLAIN"
  | "LESSON_EXAMPLE"
  | "LESSON_MINI_QUIZ"
  | "VOCAB_EXPLAIN"
  | "SIMPLIFY"
  | "START_GUIDED_LESSON"
  | "GUIDED_STUDENT_ANSWER"
  | "GUIDED_CONTINUE"
  | "GUIDED_REPEAT"
  | "GUIDED_EXAMPLE"
  | "GUIDED_FINISH";

type AiPanelGuidedState = {
  enabled: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  lastAction: string;
  completedAt?: string | null;
  nextActions?: AiPanelActionMode[];
};

type AiPanelRequest = {
  message: string;
  mode: AiPanelActionMode;
  action?: AiPanelActionMode;
};

type AiPanelResponse = {
  answer: string;
  conversationId?: string;
  messageId?: string;
  message?: {
    id: string;
    role: "ASSISTANT";
    content: string;
    createdAt: string;
  };
  guidedState?: AiPanelGuidedState | null;
};

export default function AiPanelShell({
  title,
  roleLabel,
  description,
  actions,
  placeholderMessage = "Bu dersle ilgili bir soru sor. Bir hazır örnek seçebilir veya kendi sorunu yazabilirsin.",
  onAsk,
  conversations = [],
  activeConversationId = null,
  conversationMessages = [],
  isLoadingConversations = false,
  isLoadingMessages = false,
  conversationsError = false,
  messagesError = false,
  guidedState: externalGuidedState = null,
  onSelectConversation,
  onNewConversation,
  onReloadMessages,
  onConversationCreated,
  desktopOpen = true,
  onDesktopOpenChange,
  className,
}: {
  title: string;
  roleLabel: string;
  description: string;
  actions: AiPanelAction[];
  placeholderMessage?: string;
  onAsk?: (request: AiPanelRequest) => Promise<AiPanelResponse>;
  conversations?: AiPanelConversation[];
  activeConversationId?: string | null;
  conversationMessages?: AiPanelStoredMessage[];
  isLoadingConversations?: boolean;
  isLoadingMessages?: boolean;
  conversationsError?: boolean;
  messagesError?: boolean;
  guidedState?: AiPanelGuidedState | null;
  onSelectConversation?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onReloadMessages?: () => void;
  onConversationCreated?: (conversationId: string) => void;
  desktopOpen?: boolean;
  onDesktopOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiPanelMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastRequest, setLastRequest] = useState<AiPanelRequest | null>(null);
  const [guidedState, setGuidedState] = useState<AiPanelGuidedState | null>(
    externalGuidedState,
  );
  const introMessage = useMemo<AiPanelMessage>(
    () => ({
      id: "intro",
      from: "assistant",
      text: placeholderMessage,
    }),
    [placeholderMessage],
  );
  const visibleMessages = messages.length > 0 ? messages : [introMessage];

  useEffect(() => {
    setGuidedState(externalGuidedState ?? null);
  }, [activeConversationId, externalGuidedState]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setGuidedState(null);
      return;
    }

    if (isSending) return;

    setMessages(
      conversationMessages.map((message) => ({
        id: message.id,
        from: message.role === "USER" ? "user" : "assistant",
        text: message.content || "",
      })),
    );
  }, [activeConversationId, conversationMessages, isSending]);

  const createId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const sendRequest = async (request: AiPanelRequest) => {
    const trimmedPrompt = request.message.trim();
    if (!trimmedPrompt) return;
    if (isSending) return;

    if (shouldShowUserMessage(request.action ?? request.mode)) {
      setMessages((current) => [
        ...current,
        {
          id: createId("user"),
          from: "user",
          text: trimmedPrompt,
        },
      ]);
    }
    setInput("");
    setIsSending(true);
    setLastRequest({ ...request, message: trimmedPrompt });

    try {
      const response = onAsk
        ? await onAsk({ ...request, message: trimmedPrompt })
        : { answer: placeholderMessage };
      if (response.conversationId && response.conversationId !== activeConversationId) {
        onConversationCreated?.(response.conversationId);
      }
      if (response.guidedState !== undefined) {
        setGuidedState(response.guidedState);
      }
      setLastRequest(null);
      setMessages((current) => [
        ...current,
        {
          id: response.messageId || response.message?.id || createId("assistant"),
          from: "assistant",
          text: response.message?.content || response.answer || placeholderMessage,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createId("error"),
          from: "error",
          text: "AI Öğretmen yanıt veremedi. Bağlantını kontrol edip tekrar deneyebilirsin.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const submit = () => {
    const isGuidedActive =
      guidedState?.enabled === true && guidedState.status === "IN_PROGRESS";
    void sendRequest({
      message: input,
      mode: isGuidedActive ? "GUIDED_STUDENT_ANSWER" : "LESSON_EXPLAIN",
      action: isGuidedActive ? "GUIDED_STUDENT_ANSWER" : "LESSON_EXPLAIN",
    });
  };

  return (
    <>
      <div className={cn("hidden xl:block", className)}>
        {desktopOpen ? (
          <AiPanelSurface
            title={title}
            roleLabel={roleLabel}
            description={description}
            actions={actions}
            conversations={conversations}
            activeConversationId={activeConversationId}
            isLoadingConversations={isLoadingConversations}
            isLoadingMessages={isLoadingMessages}
            conversationsError={conversationsError}
            messagesError={messagesError}
            input={input}
            messages={visibleMessages}
            guidedState={guidedState}
            setInput={setInput}
            isSending={isSending}
            lastRequest={lastRequest}
            onClose={() => onDesktopOpenChange?.(false)}
            onAction={(action) =>
              void sendRequest({
                message: action.prompt,
                mode: action.mode,
                action: action.action ?? action.mode,
              })
            }
            onGuidedStart={() =>
              void sendRequest({
                message: "Derse AI ile başla.",
                mode: "START_GUIDED_LESSON",
                action: "START_GUIDED_LESSON",
              })
            }
            onGuidedAction={(action, message) =>
              void sendRequest({
                message,
                mode: action,
                action,
              })
            }
            onRetry={() => {
              if (lastRequest) void sendRequest(lastRequest);
            }}
            onSelectConversation={onSelectConversation}
            onNewConversation={() => {
              setMessages([]);
              setGuidedState(null);
              onNewConversation?.();
            }}
            onReloadMessages={onReloadMessages}
            onSubmit={submit}
          />
        ) : (
          <button
            type="button"
            onClick={() => onDesktopOpenChange?.(true)}
            className="fixed right-0 top-1/2 z-40 flex min-h-40 w-11 -translate-y-1/2 flex-col items-center justify-center gap-3 rounded-l-lg border border-r-0 border-[var(--tm-border-subtle)] bg-white text-[var(--tm-text-secondary)] shadow-[var(--tm-shadow-card)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]"
            aria-label="AI Öğretmen panelini aç"
            title="AI Öğretmen panelini aç"
          >
            <PanelRightOpen className="h-4 w-4" strokeWidth={2.1} />
            <span className="writing-mode-vertical rotate-180 text-xs font-semibold [writing-mode:vertical-rl]">
              AI Öğretmen
            </span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed right-0 top-1/2 z-40 flex min-h-36 w-10 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-l-lg border border-r-0 border-[var(--tm-border-subtle)] bg-white text-[var(--tm-text-secondary)] shadow-[var(--tm-shadow-card)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)] xl:hidden"
        aria-label="AI Öğretmen panelini aç"
        title="AI Öğretmen"
      >
        <PanelRightOpen className="h-4 w-4" strokeWidth={2.1} />
        <span className="rotate-180 text-[11px] font-semibold [writing-mode:vertical-rl]">
          AI Öğretmen
        </span>
      </button>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/10"
            aria-label="AI panelini kapat"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[min(100vw,400px)] bg-white shadow-[0_0_24px_rgba(15,23,42,0.12)]">
            <AiPanelSurface
              title={title}
              roleLabel={roleLabel}
              description={description}
              actions={actions}
              conversations={conversations}
              activeConversationId={activeConversationId}
              isLoadingConversations={isLoadingConversations}
              isLoadingMessages={isLoadingMessages}
              conversationsError={conversationsError}
              messagesError={messagesError}
              input={input}
              messages={visibleMessages}
              guidedState={guidedState}
              setInput={setInput}
              isSending={isSending}
              lastRequest={lastRequest}
              onClose={() => setIsMobileOpen(false)}
              onAction={(action) =>
                void sendRequest({
                  message: action.prompt,
                  mode: action.mode,
                  action: action.action ?? action.mode,
                })
              }
              onGuidedStart={() =>
                void sendRequest({
                  message: "Derse AI ile başla.",
                  mode: "START_GUIDED_LESSON",
                  action: "START_GUIDED_LESSON",
                })
              }
              onGuidedAction={(action, message) =>
                void sendRequest({
                  message,
                  mode: action,
                  action,
                })
              }
              onRetry={() => {
                if (lastRequest) void sendRequest(lastRequest);
              }}
              onSelectConversation={onSelectConversation}
              onNewConversation={() => {
                setMessages([]);
                setGuidedState(null);
                onNewConversation?.();
              }}
              onReloadMessages={onReloadMessages}
              onSubmit={submit}
              compact
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function AiPanelSurface({
  title,
  roleLabel,
  description,
  actions,
  conversations,
  activeConversationId,
  isLoadingConversations,
  isLoadingMessages,
  conversationsError,
  messagesError,
  messages,
  guidedState,
  input,
  setInput,
  isSending,
  lastRequest,
  onClose,
  onAction,
  onGuidedStart,
  onGuidedAction,
  onRetry,
  onSelectConversation,
  onNewConversation,
  onReloadMessages,
  onSubmit,
  compact = false,
}: {
  title: string;
  roleLabel: string;
  description: string;
  actions: AiPanelAction[];
  conversations: AiPanelConversation[];
  activeConversationId: string | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  conversationsError: boolean;
  messagesError: boolean;
  messages: AiPanelMessage[];
  guidedState: AiPanelGuidedState | null;
  input: string;
  setInput: (value: string) => void;
  isSending: boolean;
  lastRequest: AiPanelRequest | null;
  onClose?: () => void;
  onAction: (action: AiPanelAction) => void;
  onGuidedStart: () => void;
  onGuidedAction: (action: AiPanelActionMode, message: string) => void;
  onRetry: () => void;
  onSelectConversation?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onReloadMessages?: () => void;
  onSubmit: () => void;
  compact?: boolean;
}) {
  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden border-l border-[var(--tm-border-subtle)] bg-white",
        compact
          ? "h-dvh"
          : "fixed inset-y-0 right-0 z-40 w-[min(28vw,380px)] min-w-[340px] shadow-[-8px_0_20px_rgba(15,23,42,0.04)]",
      )}
      aria-label={title}
    >
      <div className="shrink-0 border-b border-[var(--tm-border-subtle)] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--tm-text-secondary)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]"
              aria-label="AI panelini kapat"
              title="AI panelini kapat"
            >
              {compact ? (
                <X className="h-4 w-4" strokeWidth={2.1} />
              ) : (
                <PanelRightClose className="h-4 w-4" strokeWidth={2.1} />
              )}
            </button>
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--tm-bg-app)] text-[var(--tm-text-primary)] ring-1 ring-[var(--tm-border-subtle)]">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--tm-text-primary)]">
                {title}
              </h2>
              <p className="truncate text-xs text-[var(--tm-text-tertiary)]">
                {roleLabel}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onNewConversation}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--tm-text-tertiary)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]"
              aria-label="Yeni konuşma"
              title="Yeni konuşma"
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.1} />
            </button>
          </div>
        </div>
        <p className="mt-2 line-clamp-1 text-xs leading-5 text-[var(--tm-text-secondary)]">
          {description}
        </p>
        <ConversationHistory
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoading={isLoadingConversations}
          hasError={conversationsError}
          onSelectConversation={onSelectConversation}
          onNewConversation={onNewConversation}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <GuidedLessonCard
          guidedState={guidedState}
          isSending={isSending}
          onStart={onGuidedStart}
          onGuidedAction={onGuidedAction}
          onNewConversation={onNewConversation}
        />
        {isLoadingMessages ? (
          <div className="mb-3 rounded-md bg-[var(--tm-bg-app)] px-3 py-2 text-xs text-[var(--tm-text-secondary)]">
            Konuşma yükleniyor...
          </div>
        ) : null}
        {messagesError ? (
          <div className="mb-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            <p>Konuşma mesajları alınamadı.</p>
            {onReloadMessages ? (
              <button
                type="button"
                onClick={onReloadMessages}
                className="mt-2 font-semibold underline-offset-4 hover:underline"
              >
                Tekrar dene
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageBlock key={message.id} message={message} />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--tm-border-subtle)] bg-white px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--tm-text-tertiary)]">
          <Sparkles className="h-3.5 w-3.5" />
          Hızlı sorular
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5 sm:-mx-1 sm:flex-nowrap sm:gap-2 sm:overflow-x-auto sm:px-1 sm:pb-1">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onAction(action)}
              disabled={isSending}
              className="max-w-full rounded-full border border-[var(--tm-border-subtle)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--tm-text-secondary)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)] disabled:cursor-not-allowed disabled:opacity-60 sm:shrink-0 sm:px-3"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-[var(--tm-border-default)] bg-white p-2 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
          <label htmlFor="ai-panel-input" className="sr-only">
            AI Öğretmene mesaj yaz
          </label>
          <textarea
            id="ai-panel-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            placeholder="Bu dersle ilgili sorunu yaz..."
            className="min-h-14 w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-[var(--tm-text-primary)] outline-none placeholder:text-[var(--tm-text-tertiary)]"
          />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--tm-border-subtle)] px-2 pt-2">
            <span className="text-xs text-[var(--tm-text-tertiary)]">
              Sadece bu dersle ilgili yardımcı olur.
            </span>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!input.trim() || isSending}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--tm-border-default)] bg-white text-[var(--tm-text-primary)] transition hover:bg-[var(--tm-bg-hover)] disabled:cursor-not-allowed disabled:bg-[var(--tm-bg-muted)] disabled:text-[var(--tm-text-tertiary)]"
              aria-label={isSending ? "Mesaj gönderiliyor" : "Mesaj gönder"}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {lastRequest ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={isSending}
            className="text-xs font-semibold text-[var(--tm-text-secondary)] underline-offset-4 transition hover:text-[var(--tm-text-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Son isteği tekrar dene
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function ConversationHistory({
  conversations,
  activeConversationId,
  isLoading,
  hasError,
  onSelectConversation,
  onNewConversation,
}: {
  conversations: AiPanelConversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  hasError: boolean;
  onSelectConversation?: (conversationId: string) => void;
  onNewConversation?: () => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--tm-border-subtle)] bg-white px-2 py-1.5">
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-[var(--tm-text-tertiary)]">
          <History className="h-3.5 w-3.5" />
          Geçmiş
        </div>

        {isLoading ? (
          <span className="min-w-0 truncate text-xs text-[var(--tm-text-tertiary)]">
            Yükleniyor...
          </span>
        ) : hasError ? (
          <span className="min-w-0 truncate text-xs text-red-700">
            Alınamadı
          </span>
        ) : conversations.length === 0 ? (
          <span className="min-w-0 truncate text-xs text-[var(--tm-text-tertiary)]">
            Henüz konuşma yok
          </span>
        ) : (
          <select
            value={activeConversationId ?? ""}
            onChange={(event) => {
              if (event.target.value) onSelectConversation?.(event.target.value);
            }}
            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-[var(--tm-text-secondary)] outline-none"
            aria-label="Konuşma seç"
          >
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {getConversationDisplayTitle(conversation.title)}
              </option>
            ))}
          </select>
        )}
      </div>
      <button
        type="button"
        onClick={onNewConversation}
        className="inline-flex h-8 shrink-0 items-center rounded-md border border-[var(--tm-border-subtle)] bg-white px-2.5 text-xs font-medium text-[var(--tm-text-secondary)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]"
      >
        Yeni
      </button>
    </div>
  );
}

function GuidedLessonCard({
  guidedState,
  isSending,
  onStart,
  onGuidedAction,
  onNewConversation,
}: {
  guidedState: AiPanelGuidedState | null;
  isSending: boolean;
  onStart: () => void;
  onGuidedAction: (action: AiPanelActionMode, message: string) => void;
  onNewConversation?: () => void;
}) {
  const isActive =
    guidedState?.enabled === true && guidedState.status === "IN_PROGRESS";
  const isCompleted =
    guidedState?.enabled === true && guidedState.status === "COMPLETED";

  if (!isActive && !isCompleted) {
    return (
      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--tm-border-subtle)] bg-[var(--tm-bg-app)] px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--tm-text-primary)]">
            Dersi AI ile çalış
          </p>
          <p className="truncate text-xs text-[var(--tm-text-tertiary)]">
            Kısa anlatır, denetir, sonraki adımı verir.
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={isSending}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[var(--tm-border-default)] bg-white px-3 text-xs font-semibold text-[var(--tm-text-primary)] transition hover:bg-[var(--tm-bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-3.5 w-3.5" strokeWidth={2.1} />
          Başla
        </button>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ders modu tamamlandı
        </span>
        <GuidedActionButton
          label="Bağımsız alıştırmayı çöz"
          disabled={isSending}
          onClick={scrollToLessonExercise}
        />
        <GuidedActionButton
          label="Tekrar çalış"
          disabled={isSending}
          onClick={onStart}
        />
        <GuidedActionButton
          label="Yeni konuşma"
          disabled={isSending}
          onClick={() => onNewConversation?.()}
        />
      </div>
    );
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex h-7 items-center rounded-full bg-[var(--tm-bg-app)] px-2.5 text-xs font-medium text-[var(--tm-text-secondary)] ring-1 ring-[var(--tm-border-subtle)]">
        Ders modu açık
      </span>
      <GuidedActionButton
        label="Devam et"
        disabled={isSending}
        onClick={() =>
          onGuidedAction("GUIDED_CONTINUE", "Bir sonraki adıma geç.")
        }
      />
      <GuidedActionButton
        label="Tekrar anlat"
        disabled={isSending}
        onClick={() =>
          onGuidedAction("GUIDED_REPEAT", "Bu adımı daha basit tekrar anlat.")
        }
      />
      <GuidedActionButton
        label="Örnek göster"
        disabled={isSending}
        onClick={() =>
          onGuidedAction("GUIDED_EXAMPLE", "Bu adım için kısa bir örnek göster.")
        }
      />
      <GuidedActionButton
        label="Dersi bitir"
        disabled={isSending}
        onClick={() =>
          onGuidedAction("GUIDED_FINISH", "Bu guided dersi bitir ve özetle.")
        }
      />
    </div>
  );
}

function scrollToLessonExercise() {
  const target =
    document.querySelector("[data-learn-exercise]") ||
    document.querySelector("[data-exercise-section]") ||
    document.querySelector("[id*='exercise']") ||
    document.querySelector("[id*='alistirma']");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function shouldShowUserMessage(action: AiPanelActionMode): boolean {
  return ![
    "START_GUIDED_LESSON",
    "GUIDED_CONTINUE",
    "GUIDED_REPEAT",
    "GUIDED_EXAMPLE",
    "GUIDED_FINISH",
  ].includes(action);
}

function sanitizeVisibleAiText(value: string) {
  return value
    .replace(
      /^\s*(Görev|Gorev|Kurallar|İstek türü|Istek turu|Guided ders durumu|Durum|Adım|Adim|Başlık|Baslik|Son aksiyon)\s*[:：].*$/gim,
      "",
    )
    .replace(/\bKisa aciklama\b/g, "Kısa açıklama")
    .replace(/\bOrnek\b/g, "Örnek")
    .replace(/\bSimdi sen\b/g, "Şimdi sen")
    .replace(/\bOgrenci\b/g, "Öğrenci")
    .trim();
}

function GuidedActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-[var(--tm-border-subtle)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--tm-text-secondary)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function getConversationDisplayTitle(title?: string | null): string {
  const text = String(title || "").replace(/\s+/g, " ").trim();
  if (!text) return "Konuşma";
  if (/^Derse AI ile başla\.?$/i.test(text)) return "Ders modu";
  return text;
}

function MessageBlock({ message }: { message: AiPanelMessage }) {
  const visibleText = sanitizeVisibleAiText(message.text);

  if (message.from === "user") {
    return (
      <div className="ml-auto max-w-[88%] rounded-lg bg-[var(--tm-bg-app)] px-3 py-2 text-sm leading-6 text-[var(--tm-text-primary)]">
        {visibleText}
      </div>
    );
  }

  if (message.from === "error") {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
        {visibleText}
      </div>
    );
  }

  return (
    <div className="border-l-2 border-[var(--tm-border-subtle)] px-3 py-1 text-sm leading-6 text-[var(--tm-text-secondary)]">
      <p className="whitespace-pre-wrap">{visibleText}</p>
    </div>
  );
}
