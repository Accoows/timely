import type { InputHTMLAttributes } from 'react';

/**
 * Propriétés du composant InputField.
 * Hérite de toutes les propriétés natives d'un <input> HTML (type, value, onChange, etc.).
 */
interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Champ de saisie (input) standardisé pour les formulaires de l'application.
 * Gère l'affichage cohérent des labels, des bordures de focus et des erreurs de validation.
 */
export default function InputField({
  label,
  error,
  className = '',
  id,
  ...props
}: InputFieldProps) {
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-3 border ${
          error ? 'border-rose-400 focus:border-rose-500' : 'border-neutral-200 focus:border-neutral-900'
        } rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none transition-colors ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>
      )}
    </div>
  );
}
