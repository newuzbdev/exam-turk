import { useMemo, useRef, useState } from "react";

import { TURKISH_CHARACTER_SHORTCUTS } from "@/components/writing-test/writing-turkish-input";
import { useWritingTurkishLongPressInput } from "@/components/writing-test/use-writing-turkish-long-press";
import type { WritingInputMode } from "@/components/writing-test/use-writing-input-mode";

interface WritingCharacterPracticeProps {
  inputMode: WritingInputMode | null;
  onInputModeChange: (mode: WritingInputMode) => void;
  disabled?: boolean;
}

export default function WritingCharacterPractice({
  inputMode,
  onInputModeChange,
  disabled = false,
}: WritingCharacterPracticeProps) {
  const [practiceText, setPracticeText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    cancelPendingLongPress,
    handleLongPressKeyDown,
    handleLongPressKeyUp,
    lastLongPressCharacter,
  } = useWritingTurkishLongPressInput({
    textareaRef,
    contextKey: "writing-character-practice",
    disabled: disabled || inputMode !== "long-press",
    onValueChange: setPracticeText,
  });

  const completedCharacters = useMemo(() => {
    return new Set(
      TURKISH_CHARACTER_SHORTCUTS.filter(
        (shortcut) =>
          practiceText.includes(shortcut.lower) ||
          practiceText.includes(shortcut.upper),
      ).map((shortcut) => shortcut.lower),
    );
  }, [practiceText]);

  return (
    <section className="section-ready-keyboard" aria-labelledby="writing-practice-heading">
      <h2 id="writing-practice-heading" className="section-ready-keyboard-heading">
        Yazma yönteminizi seçin
      </h2>
      <fieldset className="section-ready-input-modes" disabled={disabled}>
        <legend className="sr-only">Yazma yöntemi</legend>
        <label>
          <span className="section-ready-input-mode-heading">
          <input
            type="radio"
            name="writing-input-mode"
            value="turkish-keyboard"
            aria-labelledby="writing-native-label"
            aria-describedby="writing-native-description"
            checked={inputMode === "turkish-keyboard"}
            onChange={() => { cancelPendingLongPress(); onInputModeChange("turkish-keyboard"); }}
          />
            <span id="writing-native-label" className="section-ready-input-mode-title">Türkçe klavye kullanıyorum</span>
          </span>
          <span className="section-ready-input-mode-scene" aria-hidden="true">
            <img className="section-ready-input-mode-image" src="/illustrations/writing-keyboard-v1.png" alt="" width={1635} height={962} />
            <span className="section-ready-input-mode-example"><span>ç</span><span>ğ</span><span>ş</span></span>
          </span>
          <span id="writing-native-description" className="section-ready-input-mode-description">Türkçe harfleri doğrudan yazın.</span>
        </label>
        <label>
          <span className="section-ready-input-mode-heading">
          <input
            type="radio"
            name="writing-input-mode"
            value="long-press"
            aria-labelledby="writing-hold-label"
            aria-describedby="writing-hold-description"
            checked={inputMode === "long-press"}
            onChange={() => { cancelPendingLongPress(); onInputModeChange("long-press"); }}
          />
            <span id="writing-hold-label" className="section-ready-input-mode-title">Basılı tutarak yazacağım</span>
          </span>
          <span className="section-ready-input-mode-scene" aria-hidden="true">
            <img className="section-ready-input-mode-image" src="/illustrations/writing-hold-v1.png" alt="" width={1635} height={962} />
            <span className="section-ready-input-mode-example"><span>c</span><span className="section-ready-input-mode-arrow">⟶</span><span className="section-ready-input-mode-result">ç</span></span>
          </span>
          <span id="writing-hold-description" className="section-ready-input-mode-description">Basılı tutun, sonra bırakın.<span className="sr-only"> Örneğin, c tuşuna basılı tutup bırakınca ç yazılır.</span></span>
        </label>
      </fieldset>
      <div className="section-ready-characters" aria-label="Denenecek harfler">
        {TURKISH_CHARACTER_SHORTCUTS.map((shortcut) => {
          const character = shortcut.lower;
          const completed = completedCharacters.has(character);
          const active = lastLongPressCharacter === character;
          return (
            <span
              key={character}
              className="section-ready-character"
              data-complete={completed || active || undefined}
            >
              {inputMode === "long-press" && <>
                <span className="section-ready-character-key">{shortcut.key.toLocaleLowerCase("en-US")}</span>
                <span className="section-ready-character-arrow" aria-hidden="true">→</span>
              </>}
              {character}
            </span>
          );
        })}
      </div>

      <textarea
        ref={textareaRef}
        value={practiceText}
        onChange={(event) => setPracticeText(event.target.value)}
        onKeyDown={handleLongPressKeyDown}
        onKeyUp={handleLongPressKeyUp}
        onBlur={cancelPendingLongPress}
        onPointerDown={cancelPendingLongPress}
        onCompositionStart={cancelPendingLongPress}
        rows={2}
        disabled={disabled || inputMode === null}
        spellCheck={false}
        autoCapitalize="off"
        aria-label="Türkçe karakter deneme alanı"
        aria-describedby={inputMode === "long-press" ? "writing-uppercase-hint" : undefined}
        placeholder="Buraya yazın…"
        className="section-ready-practice-input"
      />
      {inputMode === "long-press" && (
        <p id="writing-uppercase-hint" className="section-ready-keyboard-hint">
          Büyük harf için Shift’i de basılı tutun.
        </p>
      )}
    </section>
  );
}
