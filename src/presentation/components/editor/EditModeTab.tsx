type EditMode = 'form' | 'json';

interface EditModeTabProps {
  mode: EditMode;
  onSwitch: (mode: EditMode) => void;
}

export function EditModeTab({ mode, onSwitch }: EditModeTabProps) {
  return (
    <div className="edit-mode-tab" role="tablist">
      <button
        role="tab"
        type="button"
        className={`edit-tab-button${mode === 'form' ? ' active' : ''}`}
        aria-selected={mode === 'form'}
        onClick={() => onSwitch('form')}
      >
        フォームで編集
      </button>
      <button
        role="tab"
        type="button"
        className={`edit-tab-button${mode === 'json' ? ' active' : ''}`}
        aria-selected={mode === 'json'}
        onClick={() => onSwitch('json')}
      >
        JSONで編集
      </button>
    </div>
  );
}
