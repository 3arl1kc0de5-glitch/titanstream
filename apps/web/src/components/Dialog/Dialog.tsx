import type React from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {description && (
        <p className="text-sm text-text-secondary mb-5">{description}</p>
      )}
      <div className="flex gap-3">
        <Button variant="secondary" fullWidth onClick={onClose}>
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          fullWidth
          onClick={() => {
            onConfirm?.();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};
