import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * DeleteConfirmModal
 * Props:
 *   isOpen   – boolean controlling visibility
 *   fileName – name of the file being deleted
 *   onConfirm – called when user clicks "Yes, Delete"
 *   onCancel  – called when user clicks "Cancel" or presses Esc / clicks backdrop
 */
export default function DeleteConfirmModal({ isOpen, fileName, onConfirm, onCancel }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      {/* Stop clicks inside the card from closing it */}
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Close × button */}
        <button className="modal-close-btn" onClick={onCancel} aria-label="Close">
          <X size={16} />
        </button>

        {/* Warning icon */}
        <div className="modal-icon-wrap">
          <AlertTriangle size={28} className="modal-warning-icon" />
        </div>

        {/* Title */}
        <h2 className="modal-title" id="delete-modal-title">Delete File?</h2>

        {/* Body */}
        <p className="modal-body">
          You are about to permanently delete:
        </p>
        <p className="modal-filename" title={fileName}>
          {fileName}
        </p>
        <p className="modal-body modal-body-small">
          This action <strong>cannot be undone</strong>. The file will be removed from S3 and the database.
        </p>

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="modal-btn modal-btn-cancel"
            onClick={onCancel}
            id="delete-cancel-btn"
          >
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-delete"
            onClick={onConfirm}
            id="delete-confirm-btn"
            autoFocus
          >
            <Trash2 size={14} />
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}
