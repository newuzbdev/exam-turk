import { createContext, useContext } from 'react';
import type { WorkbookLanguage } from './workbook-language';

export const WorkbookLanguageContext = createContext<WorkbookLanguage>('tr');
export const useWorkbookLanguage = () => useContext(WorkbookLanguageContext);
