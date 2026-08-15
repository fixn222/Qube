'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COLUMN_TYPES, TABLE_EDITOR_INTENT } from '@qube/constants';
import type { ColumnType } from '@qube/types';
import { tableEditorAction } from '@/features/table-editor/action';
import { cn } from '@/lib/utils';

interface AddColumnDialogProps {
  orgSlug: string;
  projectSlug: string;
  tableName: string;
  onAdded: () => void;
  className?: string;
}

export function AddColumnDialog({
  orgSlug,
  projectSlug,
  tableName,
  onAdded,
  className,
}: AddColumnDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  const [defaultValue, setDefaultValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const reset = () => {
    setName('');
    setType('text');
    setDefaultValue('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData();
    formData.set('intent', TABLE_EDITOR_INTENT.ADD_COLUMN);
    formData.set('tableName', tableName);
    formData.set('name', name);
    formData.set('type', type);
    if (defaultValue.trim()) formData.set('defaultValue', defaultValue.trim());

    const result = await tableEditorAction(
      { orgSlug, projectSlug },
      {},
      formData,
    );

    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    reset();
    onAdded();
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground',
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label="Add column"
      >
        <Plus size={14} />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add column to {tableName}</DialogTitle>
            <DialogDescription>
              Adds a new column to this table via{' '}
              <span className="font-mono">ALTER TABLE ... ADD COLUMN</span>.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="column-name">Name</FieldLabel>
                <Input
                  id="column-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="column_name"
                  className="font-mono"
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as ColumnType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMN_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="font-mono">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="column-default">Default (optional)</FieldLabel>
                <Input
                  id="column-default"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder="NULL"
                  className="font-mono"
                />
              </Field>
            </FieldGroup>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? 'Adding...' : 'Add column'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}