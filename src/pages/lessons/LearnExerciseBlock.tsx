import { useMemo, useState } from "react";
import {
  Check,
  CircleAlert,
  ListChecks,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Surface, tm } from "@/components/tm";
import { useSubmitLearnExercise } from "./learn-api";
import type {
  LearnExercise,
  LearnExerciseQuestion,
  LearnExerciseSubmitAnswer,
  LearnExerciseSubmissionResult,
} from "./learn-types";

type AnswerState = Record<string, number | number[] | boolean | string>;

export default function LearnExerciseBlock({
  exercise,
  interactive,
}: {
  exercise: LearnExercise;
  interactive: boolean;
}) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [result, setResult] =
    useState<LearnExerciseSubmissionResult | null>(null);
  const submitMutation = useSubmitLearnExercise();
  const orderedQuestions = useMemo(
    () => [...exercise.questions].sort((left, right) => left.sortOrder - right.sortOrder),
    [exercise.questions],
  );
  const allAnswered = orderedQuestions.every((question) =>
    isQuestionAnswered(question, answers[question.id]),
  );
  const attemptsExhausted = result?.remainingAttempts === 0;

  const submit = () => {
    if (!allAnswered || submitMutation.isPending || attemptsExhausted) return;

    submitMutation.mutate(
      {
        exerciseId: exercise.id,
        answers: orderedQuestions.map((question) =>
          createSubmitAnswer(question, answers[question.id]),
        ),
      },
      {
        onSuccess: (submissionResult) => {
          setResult(submissionResult);
        },
      },
    );
  };

  return (
    <Surface className="overflow-hidden">
      <div className="border-b border-[var(--tm-border-subtle)] bg-[var(--tm-bg-app)] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ListChecks className="mt-0.5 h-5 w-5 text-[var(--tm-text-secondary)]" />
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--tm-text-tertiary)]">
                {exercise.isRequired ? "Zorunlu alıştırma" : "Alıştırma"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--tm-text-primary)]">
                {exercise.title}
              </h2>
              {exercise.instructions ? (
                <p className="mt-1 text-sm leading-6 text-[var(--tm-text-secondary)]">
                  {exercise.instructions}
                </p>
              ) : null}
            </div>
          </div>
          <ExerciseAttemptInfo exercise={exercise} result={result} />
        </div>
      </div>

      {!interactive ? (
        <div className="px-5 py-5 sm:px-6">
          <p className="text-sm leading-6 text-[var(--tm-text-secondary)]">
            Cevaplarını kaydetmek ve sonucunu görmek için oturum aç.
          </p>
          <NavLink
            to="/login"
            className={`${tm.subtleButton} mt-4 inline-flex h-9 items-center px-3 text-sm font-semibold`}
          >
            Oturum aç
          </NavLink>
        </div>
      ) : (
        <div className="space-y-6 px-5 py-5 sm:px-6">
          {orderedQuestions.map((question, index) => (
            <QuestionField
              key={question.id}
              question={question}
              index={index}
              value={answers[question.id]}
              disabled={submitMutation.isPending || attemptsExhausted}
              result={result?.answers.find(
                (answer) => answer.questionId === question.id,
              )}
              onChange={(value) => {
                setAnswers((current) => ({
                  ...current,
                  [question.id]: value,
                }));
              }}
            />
          ))}

          {submitMutation.isError ? (
            <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{getExerciseErrorMessage(submitMutation.error)}</span>
            </div>
          ) : null}

          {result ? <ExerciseResult result={result} /> : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--tm-border-subtle)] pt-5">
            <button
              type="button"
              onClick={submit}
              disabled={
                !allAnswered || submitMutation.isPending || attemptsExhausted
              }
              className={`${tm.primaryButton} inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {submitMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Gönderiliyor
                </>
              ) : result ? (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Tekrar dene
                </>
              ) : (
                "Cevapları gönder"
              )}
            </button>
            {!allAnswered ? (
              <span className="text-xs text-[var(--tm-text-tertiary)]">
                Göndermeden önce bütün soruları cevapla.
              </span>
            ) : null}
            {attemptsExhausted ? (
              <span className="text-xs font-medium text-[var(--tm-text-secondary)]">
                Bu alıştırma için deneme hakkın kalmadı.
              </span>
            ) : null}
          </div>
        </div>
      )}
    </Surface>
  );
}

function QuestionField({
  question,
  index,
  value,
  disabled,
  result,
  onChange,
}: {
  question: LearnExerciseQuestion;
  index: number;
  value: AnswerState[string];
  disabled: boolean;
  result?: LearnExerciseSubmissionResult["answers"][number];
  onChange: (value: AnswerState[string]) => void;
}) {
  const options = toTextOptions(question.options);

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="flex w-full items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tm-bg-muted)] text-xs font-semibold text-[var(--tm-text-secondary)]">
          {index + 1}
        </span>
        <span className="pt-0.5 text-sm font-medium leading-6 text-[var(--tm-text-primary)]">
          {question.prompt}
        </span>
      </legend>

      <div className="ml-9 mt-3">
        {question.type === "MULTIPLE_CHOICE" ? (
          <OptionList
            options={options}
            selected={typeof value === "number" ? [value] : []}
            multiple={false}
            onChange={(optionIndex) => onChange(optionIndex)}
          />
        ) : null}

        {question.type === "MULTI_SELECT" ? (
          <OptionList
            options={options}
            selected={Array.isArray(value) ? value : []}
            multiple
            onChange={(optionIndex) => {
              const current = Array.isArray(value) ? value : [];
              onChange(
                current.includes(optionIndex)
                  ? current.filter((item) => item !== optionIndex)
                  : [...current, optionIndex],
              );
            }}
          />
        ) : null}

        {question.type === "TRUE_FALSE" ? (
          <OptionList
            options={["Doğru", "Yanlış"]}
            selected={
              typeof value === "boolean" ? [value ? 0 : 1] : []
            }
            multiple={false}
            onChange={(optionIndex) => onChange(optionIndex === 0)}
          />
        ) : null}

        {question.type === "TEXT_INPUT" || question.type === "FILL_BLANK" ? (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              question.type === "FILL_BLANK"
                ? "Boşluğu doldur"
                : "Cevabını yaz"
            }
            className="h-10 w-full rounded-md border border-[var(--tm-border-default)] bg-white px-3 text-sm text-[var(--tm-text-primary)] outline-none transition focus:border-[var(--tm-text-secondary)] focus:ring-2 focus:ring-[var(--tm-bg-muted)]"
          />
        ) : null}

        {result ? (
          <div
            className={`mt-3 flex items-center gap-2 text-sm font-medium ${
              result.isCorrect ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {result.isCorrect ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span>
              {result.isCorrect ? "Doğru" : "Yanlış"} · {result.earnedPoints} puan
            </span>
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

function OptionList({
  options,
  selected,
  multiple,
  onChange,
}: {
  options: string[];
  selected: number[];
  multiple: boolean;
  onChange: (optionIndex: number) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option, optionIndex) => {
        const active = selected.includes(optionIndex);
        return (
          <label
            key={`${option}-${optionIndex}`}
            className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition ${
              active
                ? "border-[var(--tm-text-secondary)] bg-[var(--tm-bg-active)]"
                : "border-[var(--tm-border-subtle)] bg-white hover:bg-[var(--tm-bg-hover)]"
            }`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              checked={active}
              onChange={() => onChange(optionIndex)}
              className="mt-0.5 h-4 w-4 accent-[var(--tm-text-primary)]"
            />
            <span className="leading-5 text-[var(--tm-text-primary)]">{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function ExerciseResult({
  result,
}: {
  result: LearnExerciseSubmissionResult;
}) {
  return (
    <div
      className={`rounded-md border px-4 py-4 ${
        result.passed
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p
            className={`text-sm font-semibold ${
              result.passed ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {result.passed ? "Alıştırmayı geçtin" : "Henüz geçemedin"}
          </p>
          <p className="mt-1 text-xs text-[var(--tm-text-secondary)]">
            Geçme puanı: %{result.passingScore}
          </p>
        </div>
        <p className="text-lg font-semibold tabular-nums text-[var(--tm-text-primary)]">
          {result.score}/{result.maxScore} · %{result.scorePercent}
        </p>
      </div>
    </div>
  );
}

function ExerciseAttemptInfo({
  exercise,
  result,
}: {
  exercise: LearnExercise;
  result: LearnExerciseSubmissionResult | null;
}) {
  if (result?.remainingAttempts != null) {
    return (
      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-[var(--tm-text-secondary)]">
        {result.remainingAttempts} deneme kaldı
      </span>
    );
  }

  if (exercise.maxAttempts != null) {
    return (
      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-[var(--tm-text-secondary)]">
        En fazla {exercise.maxAttempts} deneme
      </span>
    );
  }

  return null;
}

const toTextOptions = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((option): option is string => typeof option === "string")
    : [];

const isQuestionAnswered = (
  question: LearnExerciseQuestion,
  value: AnswerState[string],
) => {
  if (question.type === "MULTI_SELECT") {
    return Array.isArray(value) && value.length > 0;
  }
  if (question.type === "TRUE_FALSE") {
    return typeof value === "boolean";
  }
  if (question.type === "MULTIPLE_CHOICE") {
    return typeof value === "number";
  }
  return typeof value === "string" && value.trim().length > 0;
};

const createSubmitAnswer = (
  question: LearnExerciseQuestion,
  value: AnswerState[string],
): LearnExerciseSubmitAnswer => {
  if (question.type === "MULTIPLE_CHOICE") {
    return { questionId: question.id, answer: { optionIndex: value as number } };
  }
  if (question.type === "MULTI_SELECT") {
    return {
      questionId: question.id,
      answer: { optionIndexes: value as number[] },
    };
  }
  if (question.type === "TRUE_FALSE") {
    return { questionId: question.id, answer: { value: value as boolean } };
  }
  return {
    questionId: question.id,
    answer: { value: String(value).trim() },
  };
};

const getExerciseErrorMessage = (error: unknown) => {
  const response = (
    error as {
      response?: {
        status?: number;
        data?: { message?: string | { message?: string }; error?: string };
      };
    }
  )?.response;

  if (response?.status === 409) {
    return "Bu alıştırma için deneme hakkın kalmadı.";
  }
  if (response?.status === 400) {
    return "Cevaplar gönderilemedi. Bütün soruları kontrol edip tekrar dene.";
  }
  return "Alıştırma gönderilemedi. Bağlantını kontrol edip tekrar dene.";
};
