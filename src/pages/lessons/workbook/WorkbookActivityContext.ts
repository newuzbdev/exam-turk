import { createContext } from 'react';

export const WorkbookActivityContext = createContext<(id: string, ready: boolean) => void>(() => {});
