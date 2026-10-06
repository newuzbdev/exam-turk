export type LessonPlayerLayout = 'small' | 'wide' | 'mini';
export type LessonPlayerView = {
  layout: LessonPlayerLayout;
  inlineLayout: 'small' | 'wide';
  fullscreen: boolean;
};
type ViewAction =
  | { type: 'select'; layout: LessonPlayerLayout }
  | { type: 'restore' }
  | { type: 'fullscreen'; active: boolean };

export const initialLessonPlayerView: LessonPlayerView = {
  layout: 'small', inlineLayout: 'small', fullscreen: false,
};

// Layout is separate from media: resizing never replaces or reloads the player.
export function lessonPlayerViewReducer(state: LessonPlayerView, action: ViewAction): LessonPlayerView {
  switch (action.type) {
    case 'select':
      return { ...state, layout: action.layout, inlineLayout: action.layout === 'mini' ? state.inlineLayout : action.layout };
    case 'restore':
      return { ...state, layout: state.inlineLayout };
    case 'fullscreen':
      return { ...state, fullscreen: action.active };
  }
}
