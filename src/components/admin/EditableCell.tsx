import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
  inputClassName?: string;
}

export function EditableCell({
  value,
  onSave,
  placeholder,
  allowEmpty = false,
  className,
  inputClassName,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  const commit = () => {
    if (handledRef.current) return;
    handledRef.current = true;
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed === value.trim()) return;
    if (!trimmed && !allowEmpty) {
      setDraft(value);
      return;
    }
    onSave(trimmed);
  };

  const cancel = () => {
    if (handledRef.current) return;
    handledRef.current = true;
    setDraft(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => e.target.select()}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder={placeholder}
        className={cn('h-8 px-2 text-sm', inputClassName)}
      />
    );
  }

  return (
    <span
      onClick={() => {
        handledRef.current = false;
        setIsEditing(true);
      }}
      className={cn('cursor-pointer', className)}
      title="Click to edit"
    >
      {value || <span className="text-slate-300 italic">{placeholder || 'Click to edit'}</span>}
    </span>
  );
}
