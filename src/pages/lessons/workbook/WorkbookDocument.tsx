import WorkbookBlock from './WorkbookBlock';
import { WorkbookLanguageContext } from './WorkbookLanguageContext';
import { workbookBlockInLanguage, workbookLabel, type WorkbookLanguage } from './workbook-language';
import type { ExerciseSubmitResult } from './WorkbookExercise';
import type { StudentExerciseSubmission, WorkbookDocument as WorkbookDocumentType } from './types';
import '../lesson-workbook.css';
import './workbook-editor.css';

export default function WorkbookDocument({ document, answerMode = 'student', onSubmit, language, exerciseStart = 0, compactTips = false }: {
  document: WorkbookDocumentType;
  language?: WorkbookLanguage;
  exerciseStart?: number;
  compactTips?: boolean;
  answerMode?: 'preview' | 'student';
  onSubmit?: (submission: StudentExerciseSubmission) => Promise<ExerciseSubmitResult>;
}) {
  let exerciseNumber = exerciseStart;
  return <WorkbookLanguageContext.Provider value={language ?? 'tr'}><article className="lesson-workbook workbook-document" lang={language} aria-label={workbookLabel('Ders anlatımı ve alıştırmalar', language ?? 'tr')}>
    {document.blocks.map(block => {
      const isExercise = block.kind === 'blank' || block.kind === 'choice' || block.kind === 'reflection';
      if (isExercise) exerciseNumber += 1;
      return <WorkbookBlock key={block.id} block={language ? workbookBlockInLanguage(block, language) : block} answerMode={answerMode} exerciseNumber={isExercise ? exerciseNumber : undefined} onSubmit={onSubmit} compactTips={compactTips} />;
    })}
    {document.blocks.some(block => block.kind === 'reflection') ? <p className="workbook-preview-note">{workbookLabel('Bu açık uçlu yanıt otomatik puanlanmaz. Yazdıklarınız bu sayfada kalıcı olarak kaydedilmez.', language ?? 'tr')}</p> : null}
  </article></WorkbookLanguageContext.Provider>;
}
