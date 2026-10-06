import type { FormEvent } from "react";
import { useEffect, useReducer, useRef, useState } from "react";

/* eslint-disable react-refresh/only-export-components -- Task 13 keeps tested production seams in this isolated lazy chunk. */

import {
  buildPronunciationDiagnosticReviewDto,
  pronunciationDiagnosticsService,
  type DiagnosticPronunciationVerdict,
  type DiagnosticTranscriptVerdict,
  type PronunciationDiagnosticReview,
  type PronunciationDiagnosticReviewDto,
  type PronunciationDiagnosticsResponse,
} from "@/services/pronunciationDiagnostics.service";

type DiagnosticRecording = PronunciationDiagnosticsResponse["recordings"][number];
type DiagnosticComparison = DiagnosticRecording["comparisons"][number];

export type PronunciationDiagnosticReviewDraft = {
  actualText: string;
  transcriptVerdict: DiagnosticTranscriptVerdict | "";
  pronunciationVerdict: DiagnosticPronunciationVerdict | "";
};

type ReviewDrafts = Record<string, PronunciationDiagnosticReviewDraft>;
type DiagnosticErrorKind = "load" | "save" | "export";

type DiagnosticsService = {
  get(
    submissionId: string,
    options?: { signal?: AbortSignal },
  ): Promise<PronunciationDiagnosticsResponse>;
  review(
    input: { submissionId: string } & PronunciationDiagnosticReviewDto,
    options?: { signal?: AbortSignal },
  ): Promise<PronunciationDiagnosticsResponse>;
  exportJson(
    submissionId: string,
    options?: { signal?: AbortSignal },
  ): Promise<string>;
};

export type PronunciationDiagnosticsScope = {
  submissionId: string;
  lockFingerprint: string;
};

export type PronunciationDiagnosticsPanelState = {
  scopeKey: string;
  diagnostics: PronunciationDiagnosticsResponse | null;
  drafts: ReviewDrafts;
  loadingGeneration: number | null;
  savingGenerations: Map<string, number>;
  exportGeneration: number | null;
  loadError: string;
  rowErrors: Record<string, string>;
  rowSuccesses: Record<string, string>;
  exportError: string;
};

type PronunciationDiagnosticsPanelEvent =
  | { type: "scope/reset"; scope: PronunciationDiagnosticsScope }
  | { type: "operations/cancelled"; scopeKey: string }
  | { type: "load/start"; scopeKey: string; generation: number }
  | {
      type: "load/success";
      scopeKey: string;
      generation: number;
      diagnostics: PronunciationDiagnosticsResponse;
    }
  | {
      type: "load/failure";
      scopeKey: string;
      generation: number;
      error: string;
    }
  | {
      type: "draft/change";
      scopeKey: string;
      rowKey: string;
      patch: Partial<PronunciationDiagnosticReviewDraft>;
    }
  | {
      type: "save/start";
      scopeKey: string;
      rowKey: string;
      generation: number;
    }
  | {
      type: "save/success";
      scopeKey: string;
      rowKey: string;
      generation: number;
      diagnostics: PronunciationDiagnosticsResponse;
    }
  | {
      type: "save/failure";
      scopeKey: string;
      rowKey: string;
      generation: number;
      error: string;
    }
  | { type: "export/start"; scopeKey: string; generation: number }
  | { type: "export/success"; scopeKey: string; generation: number }
  | {
      type: "export/failure";
      scopeKey: string;
      generation: number;
      error: string;
    };

type PronunciationDiagnosticsLifecycleDependencies = {
  loadDiagnostics(
    scope: PronunciationDiagnosticsScope,
    signal: AbortSignal,
  ): Promise<PronunciationDiagnosticsResponse>;
  saveReview(
    scope: PronunciationDiagnosticsScope,
    rowKey: string,
    input: PronunciationDiagnosticReviewDto,
    signal: AbortSignal,
  ): Promise<PronunciationDiagnosticsResponse>;
  exportDiagnostics(
    scope: PronunciationDiagnosticsScope,
    signal: AbortSignal,
  ): Promise<boolean>;
  emit(event: PronunciationDiagnosticsPanelEvent): void;
};

type PronunciationDiagnosticsLifecycleController = {
  setScope(scope: PronunciationDiagnosticsScope): void;
  load(scope: PronunciationDiagnosticsScope): Promise<void>;
  save(
    scope: PronunciationDiagnosticsScope,
    rowKey: string,
    input: PronunciationDiagnosticReviewDto,
  ): Promise<void>;
  exportJson(scope: PronunciationDiagnosticsScope): Promise<void>;
  cancelScope(scope: PronunciationDiagnosticsScope): void;
};

type ExportAnchor = {
  href: string;
  download: string;
  rel: string;
  style: { display?: string };
  click(): void;
  remove(): void;
};

type DiagnosticsExportEnvironment = {
  Blob: typeof Blob;
  document: {
    body: { appendChild(anchor: ExportAnchor): unknown };
    createElement(tagName: "a"): ExportAnchor;
  };
  URL: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
};

type PronunciationDiagnosticsContentProps = {
  diagnostics: PronunciationDiagnosticsResponse;
  drafts: ReviewDrafts;
  savingRows: Set<string>;
  rowErrors: Record<string, string>;
  rowSuccesses?: Record<string, string>;
  canSeek: (sectionKey: string, audioId: string) => boolean;
  onSeek: (
    sectionKey: string,
    audioId: string,
    startSeconds: number,
  ) => void;
  onDraftChange: (
    rowKey: string,
    patch: Partial<PronunciationDiagnosticReviewDraft>,
  ) => void;
  onSave: (
    audioId: string,
    comparison: DiagnosticComparison,
    rowKey: string,
  ) => void;
};

type DiagnosticComparisonCardProps = {
  recording: DiagnosticRecording;
  comparison: DiagnosticComparison;
  recordingIndex: number;
  comparisonIndex: number;
  draft: PronunciationDiagnosticReviewDraft;
  saving: boolean;
  error: string;
  success: string;
  canSeek: boolean;
  onSeek: () => void;
  onDraftChange: (
    patch: Partial<PronunciationDiagnosticReviewDraft>,
  ) => void;
  onSave: () => void;
};

export type PronunciationDiagnosticsPanelProps = {
  embedded?: boolean;
  submissionId: string;
  lockFingerprint: string;
  canSeek: (sectionKey: string, audioId: string) => boolean;
  onSeek: (
    sectionKey: string,
    audioId: string,
    startSeconds: number,
  ) => void;
};

const EMPTY_ROW_ERRORS: Record<string, string> = {};
const EMPTY_DRAFT: PronunciationDiagnosticReviewDraft = {
  actualText: "",
  transcriptVerdict: "",
  pronunciationVerdict: "",
};

const EXCLUSION_LABELS: Record<
  DiagnosticRecording["resolved"]["excludedRanges"][number]["reason"],
  string
> = {
  PROTECTED_TERM: "Korunan terim",
  PROVIDER_DISAGREEMENT: "Sağlayıcı uyuşmazlığı",
  LOW_AUDIO_QUALITY: "Düşük ses kalitesi",
};

const ERROR_MESSAGES: Record<DiagnosticErrorKind, string> = {
  load: "Yerel tanılama verileri yüklenemedi.",
  save: "İnceleme kaydedilemedi.",
  export: "Tanılama dosyası indirilemedi.",
};

const TRANSCRIPT_VERDICTS = new Set<DiagnosticTranscriptVerdict>([
  "DEEPGRAM",
  "GOOGLE_STT",
  "GEMINI",
  "ADJUDICATOR",
  "RESOLVED",
  "OTHER",
]);
const PRONUNCIATION_VERDICTS = new Set<DiagnosticPronunciationVerdict>([
  "ACCURATE",
  "INACCURATE",
  "UNSURE",
]);

export const diagnosticErrorMessage = (
  kind: DiagnosticErrorKind,
  _error: unknown,
): string => ERROR_MESSAGES[kind];

export const pronunciationDiagnosticReviewKey = (
  audioId: string,
  segmentId: string,
): string => `${audioId.length}:${audioId}${segmentId}`;

const reviewToDraft = (
  value: PronunciationDiagnosticReview | undefined,
): PronunciationDiagnosticReviewDraft => ({
  actualText: value?.actualText ?? "",
  transcriptVerdict: value?.transcriptVerdict ?? "",
  pronunciationVerdict: value?.pronunciationVerdict ?? "",
});

export const createPronunciationDiagnosticReviewDrafts = (
  diagnostics: PronunciationDiagnosticsResponse,
): ReviewDrafts => {
  const reviewerIndex = new Map(
    diagnostics.reviews.map((reviewRecord) => [
      pronunciationDiagnosticReviewKey(
        reviewRecord.audioId,
        reviewRecord.segmentId,
      ),
      reviewRecord,
    ]),
  );
  const drafts: ReviewDrafts = {};
  for (const recording of diagnostics.recordings) {
    for (const comparison of recording.comparisons) {
      const rowKey = pronunciationDiagnosticReviewKey(
        recording.audioId,
        comparison.segmentId,
      );
      drafts[rowKey] = reviewToDraft(
        reviewerIndex.get(rowKey) ?? comparison.review,
      );
    }
  }
  return drafts;
};

export const mergePronunciationDiagnosticReviewDrafts = (
  currentDrafts: ReviewDrafts,
  diagnostics: PronunciationDiagnosticsResponse,
  refreshedRowKey: string,
): ReviewDrafts => {
  const serverDrafts = createPronunciationDiagnosticReviewDrafts(diagnostics);
  const merged: ReviewDrafts = { ...currentDrafts };
  for (const [rowKey, serverDraft] of Object.entries(serverDrafts)) {
    if (rowKey === refreshedRowKey || !merged[rowKey]) {
      merged[rowKey] = serverDraft;
    }
  }
  return merged;
};

export const pronunciationDiagnosticsScopeKey = (
  scope: PronunciationDiagnosticsScope,
): string => JSON.stringify([scope.submissionId, scope.lockFingerprint]);

export const createPronunciationDiagnosticsPanelState = (
  scope: PronunciationDiagnosticsScope,
): PronunciationDiagnosticsPanelState => ({
  scopeKey: pronunciationDiagnosticsScopeKey(scope),
  diagnostics: null,
  drafts: {},
  loadingGeneration: null,
  savingGenerations: new Map(),
  exportGeneration: null,
  loadError: "",
  rowErrors: {},
  rowSuccesses: {},
  exportError: "",
});

const withoutRecordKey = (
  values: Record<string, string>,
  rowKey: string,
): Record<string, string> => {
  if (!(rowKey in values)) return values;
  const nextValues = { ...values };
  delete nextValues[rowKey];
  return nextValues;
};

export const pronunciationDiagnosticsPanelReducer = (
  state: PronunciationDiagnosticsPanelState,
  event: PronunciationDiagnosticsPanelEvent,
): PronunciationDiagnosticsPanelState => {
  if (event.type === "scope/reset") {
    return createPronunciationDiagnosticsPanelState(event.scope);
  }
  if (event.scopeKey !== state.scopeKey) return state;

  switch (event.type) {
    case "operations/cancelled":
      return {
        ...state,
        loadingGeneration: null,
        savingGenerations: new Map(),
        exportGeneration: null,
      };
    case "load/start":
      return {
        ...state,
        loadingGeneration: event.generation,
        loadError: "",
      };
    case "load/success":
      if (state.loadingGeneration !== event.generation) return state;
      return {
        ...state,
        diagnostics: event.diagnostics,
        drafts: createPronunciationDiagnosticReviewDrafts(event.diagnostics),
        loadingGeneration: null,
        loadError: "",
      };
    case "load/failure":
      if (state.loadingGeneration !== event.generation) return state;
      return {
        ...state,
        loadingGeneration: null,
        loadError: event.error,
      };
    case "draft/change": {
      const currentDraft = state.drafts[event.rowKey] ?? EMPTY_DRAFT;
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [event.rowKey]: { ...currentDraft, ...event.patch },
        },
        rowErrors: withoutRecordKey(state.rowErrors, event.rowKey),
        rowSuccesses: withoutRecordKey(state.rowSuccesses, event.rowKey),
      };
    }
    case "save/start": {
      const savingGenerations = new Map(state.savingGenerations);
      savingGenerations.set(event.rowKey, event.generation);
      return {
        ...state,
        savingGenerations,
        rowErrors: withoutRecordKey(state.rowErrors, event.rowKey),
        rowSuccesses: withoutRecordKey(state.rowSuccesses, event.rowKey),
      };
    }
    case "save/success": {
      if (state.savingGenerations.get(event.rowKey) !== event.generation) {
        return state;
      }
      const savingGenerations = new Map(state.savingGenerations);
      savingGenerations.delete(event.rowKey);
      return {
        ...state,
        diagnostics: event.diagnostics,
        drafts: mergePronunciationDiagnosticReviewDrafts(
          state.drafts,
          event.diagnostics,
          event.rowKey,
        ),
        savingGenerations,
        rowErrors: withoutRecordKey(state.rowErrors, event.rowKey),
        rowSuccesses: {
          ...state.rowSuccesses,
          [event.rowKey]: "İnceleme kaydedildi.",
        },
      };
    }
    case "save/failure": {
      if (state.savingGenerations.get(event.rowKey) !== event.generation) {
        return state;
      }
      const savingGenerations = new Map(state.savingGenerations);
      savingGenerations.delete(event.rowKey);
      return {
        ...state,
        savingGenerations,
        rowErrors: { ...state.rowErrors, [event.rowKey]: event.error },
        rowSuccesses: withoutRecordKey(state.rowSuccesses, event.rowKey),
      };
    }
    case "export/start":
      return {
        ...state,
        exportGeneration: event.generation,
        exportError: "",
      };
    case "export/success":
      if (state.exportGeneration !== event.generation) return state;
      return { ...state, exportGeneration: null, exportError: "" };
    case "export/failure":
      if (state.exportGeneration !== event.generation) return state;
      return {
        ...state,
        exportGeneration: null,
        exportError: event.error,
      };
  }
};

type LifecycleOperation = {
  scopeKey: string;
  generation: number;
  mutationEpoch: number;
  controller: AbortController;
};

export const createPronunciationDiagnosticsLifecycleController = (
  dependencies: PronunciationDiagnosticsLifecycleDependencies,
): PronunciationDiagnosticsLifecycleController => {
  let currentScopeKey: string | null = null;
  let generation = 0;
  let mutationEpoch = 0;
  let loadedScopeKey: string | null = null;
  let cacheRequiresReload = false;
  let loadOperation: LifecycleOperation | null = null;
  const saveOperations = new Map<string, LifecycleOperation>();
  let exportOperation: LifecycleOperation | null = null;

  const nextOperation = (scopeKey: string): LifecycleOperation => ({
    scopeKey,
    generation: (generation += 1),
    mutationEpoch,
    controller: new AbortController(),
  });

  const abortOperations = () => {
    loadOperation?.controller.abort();
    loadOperation = null;
    for (const operation of saveOperations.values()) {
      operation.controller.abort();
    }
    saveOperations.clear();
    exportOperation?.controller.abort();
    exportOperation = null;
  };

  const ownsLoad = (operation: LifecycleOperation) =>
    currentScopeKey === operation.scopeKey && loadOperation === operation;
  const ownsSave = (rowKey: string, operation: LifecycleOperation) =>
    currentScopeKey === operation.scopeKey &&
    saveOperations.get(rowKey) === operation;
  const ownsExport = (operation: LifecycleOperation) =>
    currentScopeKey === operation.scopeKey && exportOperation === operation;

  const setScope = (scope: PronunciationDiagnosticsScope) => {
    const scopeKey = pronunciationDiagnosticsScopeKey(scope);
    if (currentScopeKey === scopeKey) return;
    abortOperations();
    currentScopeKey = scopeKey;
    mutationEpoch = 0;
    loadedScopeKey = null;
    cacheRequiresReload = false;
    dependencies.emit({ type: "scope/reset", scope });
  };

  return {
    setScope,
    async load(scope) {
      const scopeKey = pronunciationDiagnosticsScopeKey(scope);
      if (currentScopeKey !== scopeKey || loadedScopeKey === scopeKey) return;
      if (loadOperation?.scopeKey === scopeKey) return;

      loadOperation?.controller.abort();
      const operation = nextOperation(scopeKey);
      loadOperation = operation;
      dependencies.emit({
        type: "load/start",
        scopeKey,
        generation: operation.generation,
      });
      try {
        const diagnostics = await dependencies.loadDiagnostics(
          scope,
          operation.controller.signal,
        );
        if (!ownsLoad(operation) || operation.controller.signal.aborted) return;
        const loadIsCurrent =
          operation.mutationEpoch === mutationEpoch &&
          saveOperations.size === 0;
        loadedScopeKey = loadIsCurrent ? scopeKey : null;
        if (loadIsCurrent) cacheRequiresReload = false;
        dependencies.emit({
          type: "load/success",
          scopeKey,
          generation: operation.generation,
          diagnostics,
        });
      } catch (error: unknown) {
        if (!ownsLoad(operation) || operation.controller.signal.aborted) return;
        dependencies.emit({
          type: "load/failure",
          scopeKey,
          generation: operation.generation,
          error: diagnosticErrorMessage("load", error),
        });
      } finally {
        if (loadOperation === operation) loadOperation = null;
      }
    },
    async save(scope, rowKey, input) {
      const scopeKey = pronunciationDiagnosticsScopeKey(scope);
      if (currentScopeKey !== scopeKey) return;

      const supersededOperation = saveOperations.get(rowKey);
      if (supersededOperation) {
        cacheRequiresReload = true;
        supersededOperation.controller.abort();
      }
      mutationEpoch += 1;
      loadedScopeKey = null;
      const operation = nextOperation(scopeKey);
      saveOperations.set(rowKey, operation);
      dependencies.emit({
        type: "save/start",
        scopeKey,
        rowKey,
        generation: operation.generation,
      });
      try {
        const diagnostics = await dependencies.saveReview(
          scope,
          rowKey,
          input,
          operation.controller.signal,
        );
        if (!ownsSave(rowKey, operation) || operation.controller.signal.aborted) {
          return;
        }
        const hasAnotherActiveSave = Array.from(
          saveOperations.values(),
        ).some((candidate) => candidate !== operation);
        loadedScopeKey =
          operation.mutationEpoch === mutationEpoch &&
          !hasAnotherActiveSave &&
          !cacheRequiresReload
            ? scopeKey
            : null;
        dependencies.emit({
          type: "save/success",
          scopeKey,
          rowKey,
          generation: operation.generation,
          diagnostics,
        });
      } catch (error: unknown) {
        if (!ownsSave(rowKey, operation) || operation.controller.signal.aborted) {
          return;
        }
        cacheRequiresReload = true;
        dependencies.emit({
          type: "save/failure",
          scopeKey,
          rowKey,
          generation: operation.generation,
          error: diagnosticErrorMessage("save", error),
        });
      } finally {
        if (saveOperations.get(rowKey) === operation) {
          saveOperations.delete(rowKey);
        }
      }
    },
    async exportJson(scope) {
      const scopeKey = pronunciationDiagnosticsScopeKey(scope);
      if (currentScopeKey !== scopeKey) return;

      exportOperation?.controller.abort();
      const operation = nextOperation(scopeKey);
      exportOperation = operation;
      dependencies.emit({
        type: "export/start",
        scopeKey,
        generation: operation.generation,
      });
      try {
        await dependencies.exportDiagnostics(
          scope,
          operation.controller.signal,
        );
        if (!ownsExport(operation) || operation.controller.signal.aborted) return;
        dependencies.emit({
          type: "export/success",
          scopeKey,
          generation: operation.generation,
        });
      } catch (error: unknown) {
        if (!ownsExport(operation) || operation.controller.signal.aborted) return;
        dependencies.emit({
          type: "export/failure",
          scopeKey,
          generation: operation.generation,
          error: diagnosticErrorMessage("export", error),
        });
      } finally {
        if (exportOperation === operation) exportOperation = null;
      }
    },
    cancelScope(scope) {
      const scopeKey = pronunciationDiagnosticsScopeKey(scope);
      if (currentScopeKey !== scopeKey) return;
      if (saveOperations.size > 0) cacheRequiresReload = true;
      abortOperations();
      dependencies.emit({ type: "operations/cancelled", scopeKey });
    },
  };
};

export const savePronunciationDiagnosticReview = async (
  service: Pick<DiagnosticsService, "review" | "get">,
  submissionId: string,
  input: PronunciationDiagnosticReviewDto,
  signal?: AbortSignal,
): Promise<PronunciationDiagnosticsResponse> => {
  const dto = buildPronunciationDiagnosticReviewDto(input);
  await service.review(
    { submissionId, ...dto },
    signal ? { signal } : undefined,
  );
  return service.get(submissionId, signal ? { signal } : undefined);
};

const safeEncodedSubmissionId = (submissionId: string): string => {
  const encodedParts: string[] = [];
  let encodedLength = 0;
  for (const character of Array.from(submissionId.trim()).slice(0, 100)) {
    let encodedCharacter: string;
    try {
      encodedCharacter = encodeURIComponent(character);
    } catch {
      encodedCharacter = "_";
    }
    if (encodedLength + encodedCharacter.length > 180) break;
    encodedParts.push(encodedCharacter);
    encodedLength += encodedCharacter.length;
  }
  return encodedParts.join("") || "submission";
};

export const downloadPronunciationDiagnosticsJson = async (
  service: Pick<DiagnosticsService, "exportJson">,
  submissionId: string,
  providedEnvironment?: DiagnosticsExportEnvironment,
  shouldContinue: () => boolean = () => true,
  signal?: AbortSignal,
): Promise<boolean> => {
  const json = await service.exportJson(
    submissionId,
    signal ? { signal } : undefined,
  );
  const canContinue = () => !signal?.aborted && shouldContinue();
  if (!canContinue()) return false;

  const environment =
    providedEnvironment ??
    ({
      Blob: globalThis.Blob,
      document: globalThis.document,
      URL: globalThis.URL,
    } as DiagnosticsExportEnvironment);
  let objectUrl: string | null = null;
  let anchor: ExportAnchor | null = null;
  try {
    const blob = new environment.Blob([json], { type: "application/json" });
    if (!canContinue()) return false;
    objectUrl = environment.URL.createObjectURL(blob);
    if (!canContinue()) return false;
    anchor = environment.document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `pronunciation-diagnostics-${safeEncodedSubmissionId(
      submissionId,
    )}.json`;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    if (!canContinue()) return false;
    environment.document.body.appendChild(anchor);
    if (!canContinue()) return false;
    anchor.click();
    return canContinue();
  } finally {
    try {
      anchor?.remove();
    } finally {
      if (objectUrl !== null) environment.URL.revokeObjectURL(objectUrl);
    }
  }
};

const clampDiagnosticSeconds = (value: number, durationSeconds: number) => {
  const safeDuration =
    Number.isFinite(durationSeconds) && durationSeconds >= 0
      ? durationSeconds
      : 0;
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return Math.min(safeValue, safeDuration);
};

const formatDiagnosticTimestamp = (seconds: number) => {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
};

const rangeOverlapsComparison = (
  range: DiagnosticRecording["resolved"]["excludedRanges"][number],
  startSeconds: number,
  endSeconds: number,
) => {
  if (
    typeof range.startSeconds !== "number" &&
    typeof range.endSeconds !== "number"
  ) {
    return true;
  }
  const rangeStart =
    typeof range.startSeconds === "number" ? range.startSeconds : 0;
  const rangeEnd =
    typeof range.endSeconds === "number"
      ? range.endSeconds
      : Number.POSITIVE_INFINITY;
  return rangeStart <= endSeconds && rangeEnd >= startSeconds;
};

function DiagnosticComparisonCard({
  recording,
  comparison,
  recordingIndex,
  comparisonIndex,
  draft,
  saving,
  error,
  success,
  canSeek,
  onSeek,
  onDraftChange,
  onSave,
}: DiagnosticComparisonCardProps) {
  const startSeconds = clampDiagnosticSeconds(
    comparison.startSeconds,
    recording.durationSeconds,
  );
  const endSeconds = Math.max(
    startSeconds,
    clampDiagnosticSeconds(comparison.endSeconds, recording.durationSeconds),
  );
  const exclusions = recording.resolved.excludedRanges.filter((range) =>
    rangeOverlapsComparison(range, startSeconds, endSeconds),
  );
  const protectedRange = exclusions.some(
    (range) => range.reason === "PROTECTED_TERM",
  );
  const exclusionText = Array.from(
    new Set(exclusions.map((range) => EXCLUSION_LABELS[range.reason])),
  ).join(", ");
  const fieldPrefix = `pronunciation-review-${recordingIndex}-${comparisonIndex}`;
  const rowErrorId = `${fieldPrefix}-row-error`;
  const rowSuccessId = `${fieldPrefix}-row-success`;
  const rowSavingId = `${fieldPrefix}-row-saving`;
  const actualTextErrorId = `${fieldPrefix}-actual-text-error`;
  const transcriptVerdictErrorId = `${fieldPrefix}-transcript-verdict-error`;
  const pronunciationVerdictErrorId = `${fieldPrefix}-pronunciation-verdict-error`;
  const actualTextMissing = draft.actualText.trim().length === 0;
  const actualTextTooLong = draft.actualText.length > 500;
  const transcriptVerdictInvalid = !TRANSCRIPT_VERDICTS.has(
    draft.transcriptVerdict as DiagnosticTranscriptVerdict,
  );
  const pronunciationVerdictInvalid = !PRONUNCIATION_VERDICTS.has(
    draft.pronunciationVerdict as DiagnosticPronunciationVerdict,
  );
  const rowStatusId = error
    ? rowErrorId
    : saving
      ? rowSavingId
      : success
        ? rowSuccessId
        : "";
  const describedBy = (...ids: Array<string | false>) =>
    ids.filter(Boolean).join(" ") || undefined;
  const systemText =
    comparison.selectedText ||
    recording.fusion?.semanticText ||
    recording.resolved.displayText;
  const geminiText = comparison.geminiText || comparison.googleText;
  const alternatives = comparison.providerAlternatives ?? [];
  const localMetadata = [
    ["Çözüm kararı", comparison.resolution],
    ["Puan politikası", comparison.scorePolicy],
    ["Dil ipucu", comparison.languageHint],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  return (
    <article
      className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
      aria-busy={saving}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
        <button
          type="button"
          onClick={onSeek}
          disabled={!canSeek || saving}
          className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
          aria-label={`${formatDiagnosticTimestamp(startSeconds)} konumundan yerel tanılama kaydını dinle`}
        >
          {formatDiagnosticTimestamp(startSeconds)}–
          {formatDiagnosticTimestamp(endSeconds)}
        </button>
        <div className="flex flex-wrap gap-2" aria-label="Kanıt koruma durumu">
          <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-900">
            {protectedRange ? "Korunan aralık" : "Koruma yok"}
          </span>
          <span className="rounded-full border border-neutral-300 bg-neutral-50 px-2 py-1 text-[11px] font-semibold text-neutral-800">
            {exclusionText
              ? `Değerlendirme dışı: ${exclusionText}`
              : "Değerlendirme dışı değil"}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-md bg-neutral-50 p-3">
          <dt className="text-xs font-semibold text-neutral-600">
            Deepgram böyle duydu
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-900">
            {comparison.deepgramText || "—"}
          </dd>
        </div>
        <div className="rounded-md bg-neutral-50 p-3">
          <dt className="text-xs font-semibold text-neutral-600">
            Google STT böyle duydu
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-900">
            {comparison.googleSttText || "—"}
          </dd>
        </div>
        <div className="rounded-md bg-neutral-50 p-3">
          <dt className="text-xs font-semibold text-neutral-600">
            Gemini böyle duydu
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-900">
            {geminiText || "—"}
          </dd>
        </div>
        {comparison.adjudicatorText ? (
          <div className="rounded-md bg-neutral-50 p-3">
            <dt className="text-xs font-semibold text-neutral-600">
              OpenAI doğrulaması
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-900">
              {comparison.adjudicatorText}
            </dd>
          </div>
        ) : null}
        <div className="rounded-md bg-amber-50 p-3">
          <dt className="text-xs font-semibold text-amber-900">
            Sistemin kullandığı metin
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-900">
            {systemText || "—"}
          </dd>
        </div>
      </dl>

      {localMetadata.length > 0 || alternatives.length > 0 ? (
        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50/70 px-3 py-2.5 text-xs text-neutral-700">
          {localMetadata.length > 0 ? (
            <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
              {localMetadata.map(([label, value]) => (
                <div key={label} className="flex min-w-0 items-baseline gap-1.5">
                  <dt className="font-semibold text-neutral-800">{label}</dt>
                  <dd className="break-all font-mono text-[11px]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {alternatives.length > 0 ? (
            <details className={localMetadata.length > 0 ? "mt-2" : ""}>
              <summary className="cursor-pointer font-semibold text-neutral-800">
                Aday alternatifleri
              </summary>
              <ul className="mt-1.5 space-y-1 pl-4">
                {alternatives.map((alternative, alternativeIndex) => (
                  <li
                    key={`${alternative.provider}-${alternativeIndex}`}
                    className="list-disc break-words"
                  >
                    <span className="font-mono text-[11px]">
                      {alternative.provider}
                    </span>{" "}
                    — {alternative.text}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitReview}>
        <div className="md:col-span-2">
          <label
            htmlFor={`${fieldPrefix}-actual-text`}
            className="text-sm font-semibold text-neutral-900"
          >
            Gerçekte söylediğim
          </label>
          <textarea
            id={`${fieldPrefix}-actual-text`}
            value={draft.actualText}
            onChange={(event) =>
              onDraftChange({ actualText: event.currentTarget.value })
            }
            maxLength={500}
            rows={2}
            disabled={saving}
            required
            aria-required="true"
            aria-invalid={Boolean(
              error && (actualTextMissing || actualTextTooLong),
            )}
            aria-describedby={describedBy(
              Boolean(error && (actualTextMissing || actualTextTooLong)) &&
                actualTextErrorId,
              rowStatusId,
            )}
            className="mt-1.5 w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:bg-neutral-100"
          />
          {error && (actualTextMissing || actualTextTooLong) ? (
            <p id={actualTextErrorId} className="mt-1 text-xs text-red-700">
              {actualTextMissing
                ? "Söylenen metni girin."
                : "Söylenen metin en fazla 500 karakter olabilir."}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${fieldPrefix}-transcript-verdict`}
            className="text-sm font-semibold text-neutral-900"
          >
            Transcript kararı
          </label>
          <select
            id={`${fieldPrefix}-transcript-verdict`}
            value={draft.transcriptVerdict}
            onChange={(event) =>
              onDraftChange({
                transcriptVerdict: event.currentTarget
                  .value as PronunciationDiagnosticReviewDraft["transcriptVerdict"],
              })
            }
            disabled={saving}
            required
            aria-required="true"
            aria-invalid={Boolean(error && transcriptVerdictInvalid)}
            aria-describedby={describedBy(
              Boolean(error && transcriptVerdictInvalid) &&
                transcriptVerdictErrorId,
              rowStatusId,
            )}
            className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:bg-neutral-100"
          >
            <option value="">Karar seçin</option>
            <option value="DEEPGRAM">Deepgram metni</option>
            <option value="GOOGLE_STT">Google STT metni</option>
            <option value="GEMINI">Gemini metni</option>
            <option value="ADJUDICATOR">OpenAI doğrulaması</option>
            <option value="RESOLVED">Sistemin metni</option>
            <option value="OTHER">Diğer metin</option>
          </select>
          {error && transcriptVerdictInvalid ? (
            <p
              id={transcriptVerdictErrorId}
              className="mt-1 text-xs text-red-700"
            >
              Transcript kararını seçin.
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${fieldPrefix}-pronunciation-verdict`}
            className="text-sm font-semibold text-neutral-900"
          >
            Telaffuz kararı
          </label>
          <select
            id={`${fieldPrefix}-pronunciation-verdict`}
            value={draft.pronunciationVerdict}
            onChange={(event) =>
              onDraftChange({
                pronunciationVerdict: event.currentTarget
                  .value as PronunciationDiagnosticReviewDraft["pronunciationVerdict"],
              })
            }
            disabled={saving}
            required
            aria-required="true"
            aria-invalid={Boolean(error && pronunciationVerdictInvalid)}
            aria-describedby={describedBy(
              Boolean(error && pronunciationVerdictInvalid) &&
                pronunciationVerdictErrorId,
              rowStatusId,
            )}
            className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:bg-neutral-100"
          >
            <option value="">Karar seçin</option>
            <option value="ACCURATE">Doğru telaffuz</option>
            <option value="INACCURATE">Hatalı telaffuz</option>
            <option value="UNSURE">Emin değilim</option>
          </select>
          {error && pronunciationVerdictInvalid ? (
            <p
              id={pronunciationVerdictErrorId}
              className="mt-1 text-xs text-red-700"
            >
              Telaffuz kararını seçin.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
          <div className="min-h-5" aria-live="polite">
            {error ? (
              <p id={rowErrorId} className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : saving ? (
              <p
                id={rowSavingId}
                className="text-sm text-neutral-600"
                role="status"
              >
                Kaydediliyor…
              </p>
            ) : success ? (
              <p
                id={rowSuccessId}
                className="text-sm font-medium text-emerald-800"
                role="status"
              >
                {success}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            {saving ? "Kaydediliyor…" : "Bu satırı kaydet"}
          </button>
        </div>
      </form>
    </article>
  );
}

export function PronunciationDiagnosticsContent({
  diagnostics,
  drafts,
  savingRows,
  rowErrors,
  rowSuccesses = EMPTY_ROW_ERRORS,
  canSeek,
  onSeek,
  onDraftChange,
  onSave,
}: PronunciationDiagnosticsContentProps) {
  const comparisonCount = diagnostics.recordings.reduce(
    (total, recording) => total + recording.comparisons.length,
    0,
  );

  if (comparisonCount === 0) {
    return (
      <p className="rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        Karşılaştırılabilir tanılama satırı bulunamadı.
      </p>
    );
  }

  return (
    <ol className="space-y-5" aria-label="Yerel telaffuz karşılaştırmaları">
      {diagnostics.recordings.map((recording, recordingIndex) => (
        <li key={recording.audioId}>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">
            Kayıt {recordingIndex + 1}
          </h3>
          <div className="space-y-3">
            {recording.comparisons.map((comparison, comparisonIndex) => {
              const rowKey = pronunciationDiagnosticReviewKey(
                recording.audioId,
                comparison.segmentId,
              );
              return (
                <DiagnosticComparisonCard
                  key={rowKey}
                  recording={recording}
                  comparison={comparison}
                  recordingIndex={recordingIndex}
                  comparisonIndex={comparisonIndex}
                  draft={drafts[rowKey] ?? EMPTY_DRAFT}
                  saving={savingRows.has(rowKey)}
                  error={rowErrors[rowKey] ?? ""}
                  success={rowSuccesses[rowKey] ?? ""}
                  canSeek={canSeek(recording.sectionKey, recording.audioId)}
                  onSeek={() =>
                    onSeek(
                      recording.sectionKey,
                      recording.audioId,
                      comparison.startSeconds,
                    )
                  }
                  onDraftChange={(patch) => onDraftChange(rowKey, patch)}
                  onSave={() => onSave(recording.audioId, comparison, rowKey)}
                />
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}

export const loadNormalizedDiagnostics = async (
  submissionId: string,
  signal: AbortSignal,
): Promise<PronunciationDiagnosticsResponse> => {
  if (signal.aborted) throw new Error("cancelled");
  const diagnostics = await pronunciationDiagnosticsService.get(submissionId, {
    signal,
  });
  if (signal.aborted) throw new Error("cancelled");
  return diagnostics;
};

export default function PronunciationDiagnosticsPanel({
  embedded = false,
  submissionId,
  lockFingerprint,
  canSeek,
  onSeek,
}: PronunciationDiagnosticsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const scope: PronunciationDiagnosticsScope = {
    submissionId,
    lockFingerprint,
  };
  const scopeKey = pronunciationDiagnosticsScopeKey(scope);
  const [state, dispatch] = useReducer(
    pronunciationDiagnosticsPanelReducer,
    scope,
    createPronunciationDiagnosticsPanelState,
  );
  const lifecycleRef =
    useRef<PronunciationDiagnosticsLifecycleController | null>(null);
  if (!lifecycleRef.current) {
    lifecycleRef.current = createPronunciationDiagnosticsLifecycleController({
      loadDiagnostics: (requestScope, signal) =>
        loadNormalizedDiagnostics(requestScope.submissionId, signal),
      saveReview: (requestScope, _rowKey, input, signal) =>
        savePronunciationDiagnosticReview(
          pronunciationDiagnosticsService,
          requestScope.submissionId,
          input,
          signal,
        ),
      exportDiagnostics: (requestScope, signal) =>
        downloadPronunciationDiagnosticsJson(
          pronunciationDiagnosticsService,
          requestScope.submissionId,
          undefined,
          () => !signal.aborted,
          signal,
        ),
      emit: dispatch,
    });
  }

  useEffect(() => {
    const effectScope = { submissionId, lockFingerprint };
    const lifecycle = lifecycleRef.current;
    lifecycle?.setScope(effectScope);
    if (expanded) void lifecycle?.load(effectScope);

    return () => {
      lifecycle?.cancelScope(effectScope);
    };
  }, [expanded, lockFingerprint, submissionId]);

  const currentState =
    state.scopeKey === scopeKey
      ? state
      : createPronunciationDiagnosticsPanelState(scope);
  const diagnostics = currentState.diagnostics;
  const drafts = currentState.drafts;
  const savingRows = new Set(currentState.savingGenerations.keys());
  const loading = currentState.loadingGeneration !== null;
  const exporting = currentState.exportGeneration !== null;

  const updateDraft = (
    rowKey: string,
    patch: Partial<PronunciationDiagnosticReviewDraft>,
  ) => {
    dispatch({
      type: "draft/change",
      scopeKey,
      rowKey,
      patch,
    });
  };

  const saveRow = (
    audioId: string,
    comparison: DiagnosticComparison,
    rowKey: string,
  ) => {
    const draft = drafts[rowKey] ?? EMPTY_DRAFT;
    void lifecycleRef.current?.save(
      scope,
      rowKey,
      {
        audioId,
        segmentId: comparison.segmentId,
        actualText: draft.actualText,
        transcriptVerdict:
          draft.transcriptVerdict as DiagnosticTranscriptVerdict,
        pronunciationVerdict:
          draft.pronunciationVerdict as DiagnosticPronunciationVerdict,
      },
    );
  };

  const exportDiagnostics = () => {
    void lifecycleRef.current?.exportJson(scope);
  };

  return (
    <section
      className={
        embedded
          ? "mt-4 border-t border-[var(--tm-border-subtle)] pt-4"
          : "rounded-lg border border-dashed border-amber-400 bg-amber-50/60 p-4"
      }
      aria-label="Yerel telaffuz tanılaması"
    >
      <div className={`flex flex-wrap items-center gap-3 ${embedded ? "justify-end" : "justify-between"}`}>
        {!embedded ? (
          <div>
            <h2 className="text-sm font-semibold text-amber-950">
              Yerel tanılama — resmî puan değildir
            </h2>
            <p className="mt-1 text-xs leading-5 text-amber-900">
              Yalnızca yerel kalibrasyon ve inceleme amacıyla kullanılır.
            </p>
          </div>
        ) : null}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="pronunciation-diagnostics-content"
          onClick={() => setExpanded((currentExpanded) => !currentExpanded)}
          className={
            embedded
              ? "rounded-md border border-[var(--tm-border-default)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tm-text-primary)] hover:bg-[#f7f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#777773]/40 focus-visible:ring-offset-2"
              : "rounded-md border border-amber-700 bg-white px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
          }
        >
          {expanded ? "Yerel tanılamayı kapat" : "Yerel tanılamayı aç"}
        </button>
      </div>

      {expanded ? (
        <div
          id="pronunciation-diagnostics-content"
          className={`mt-4 border-t pt-4 ${embedded ? "border-[var(--tm-border-subtle)]" : "border-amber-200"}`}
        >
          {loading ? (
            <p className="text-sm text-neutral-600" role="status">
              Yerel tanılama yükleniyor…
            </p>
          ) : currentState.loadError ? (
            <p className="text-sm text-red-700" role="alert">
              {currentState.loadError}
            </p>
          ) : diagnostics ? (
            <PronunciationDiagnosticsContent
              diagnostics={diagnostics}
              drafts={drafts}
              savingRows={savingRows}
              rowErrors={currentState.rowErrors}
              rowSuccesses={currentState.rowSuccesses}
              canSeek={canSeek}
              onSeek={onSeek}
              onDraftChange={updateDraft}
              onSave={(audioId, comparison, rowKey) =>
                void saveRow(audioId, comparison, rowKey)
              }
            />
          ) : (
            <p className="text-sm text-neutral-600" role="status">
              Yerel tanılama hazırlanıyor…
            </p>
          )}

          {diagnostics ? (
            <div className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${embedded ? "border-[var(--tm-border-subtle)]" : "border-amber-200"}`}>
              <div className="min-h-5" aria-live="polite">
                {currentState.exportError ? (
                  <p className="text-sm text-red-700" role="alert">
                    {currentState.exportError}
                  </p>
                ) : exporting ? (
                  <p className="text-sm text-neutral-600" role="status">
                    JSON hazırlanıyor…
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={exportDiagnostics}
                disabled={exporting}
                className="rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
              >
                {exporting ? "JSON hazırlanıyor…" : "Normalize JSON indir"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
