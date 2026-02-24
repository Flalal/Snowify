import { useEffect, useRef } from 'preact/hooks';
import { modalVisible, modalTitle, modalDefaultValue, cleanupInputModal } from '../../state/ui.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

export { showInputModal } from '../../state/ui.js';

export function InputModal() {
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const visible = modalVisible.value;

  useFocusTrap(modalRef, visible);

  useEffect(() => {
    if (visible && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.select();
      }, 50);
    }
  }, [visible]);

  if (!visible) return null;

  function onOk() {
    const val = inputRef.current ? inputRef.current.value.trim() : '';
    cleanupInputModal(val || null);
  }

  function onCancel() {
    cleanupInputModal(null);
  }

  function onKey(e) {
    if (e.key === 'Enter') onOk();
    if (e.key === 'Escape') onCancel();
  }

  function onOverlay(e) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    <div
      id="input-modal"
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="input-modal-title"
      onClick={onOverlay}
    >
      <div className="modal-box" ref={modalRef}>
        <h3 id="input-modal-title">{modalTitle.value}</h3>
        <input
          ref={inputRef}
          id="input-modal-input"
          type="text"
          value={modalDefaultValue.value}
          onInput={(e) => {
            modalDefaultValue.value = e.currentTarget.value;
          }}
          onKeyDown={onKey}
        />
        <div className="modal-buttons">
          <button id="input-modal-cancel" className="modal-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button id="input-modal-ok" className="modal-btn ok" onClick={onOk}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
