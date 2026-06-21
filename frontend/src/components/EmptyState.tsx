import React from 'react';
import Button from './Button';

/**
 * Propriétés requises pour afficher un état vide (EmptyState).
 * Permet de configurer le texte, l'icône, et l'action optionnelle associée.
 */
interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'outline';
  className?: string;
}

/**
 * Composant d'interface standardisé pour les zones sans données (listes vides, etc).
 * Il s'intègre au design system (bordures pointillées, icône stylisée) et propose
 * en option un bouton d'action pour inviter l'utilisateur à créer une donnée.
 */
export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  actionVariant = 'outline',
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50/50 ${className}`}>
      <div className="p-4 bg-white border-2 border-neutral-900 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-neutral-900 mb-5 shrink-0">
        {icon}
      </div>
      <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight mb-2">{title}</h3>
      <p className="text-neutral-500 text-xs max-w-sm mb-6 font-semibold leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant={actionVariant} onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
