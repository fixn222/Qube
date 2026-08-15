'use client';

import { useActionState, useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COLUMN_TYPES, TABLE_EDITOR_INTENT } from '@qube/constants';
import type { ColumnType } from '@qube/types';
import { createTableSchema } from '@/features/table-editor/client.schema';
import { tableEditorAction } from '@/features/table-editor/action';
import { cn } from '@/lib/utils';

type CreateTableValues = z.infer<typeof createTableSchema>;

interface CreateTableDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  projectSlug: string;
  existingTables: string[];
  onCreated: (tableName: string) => void;
}

const sheetClassName = cn(
  'flex h-full w-full max-w-full flex-col gap-0! overflow-hidden p-0! shadow-2xl',
  'data-[side=right]:w-full data-[side=right]:max-w-full',
  'sm:data-[side=right]:w-[700px] sm:data-[side=right]:max-w-[700px]',
);

export function CreateTableDrawer({
  open,
  onOpenChange,
  orgSlug,
  projectSlug,
  existingTables,
  onCreated,
}: CreateTableDrawerProps) {
  const boundAction = tableEditorAction.bind(null, { orgSlug, projectSlug });
  const [state, formAction, isPending] = useActionState(boundAction, {});

  const form = useForm<CreateTableValues>({
    resolver: zodResolver(createTableSchema),
    defaultValues: {
      name: '',
      columns: [
        {
          name: 'id',
          type: 'bigint',
          isNullable: false,
          isPrimaryKey: true,
          defaultValue: '',
        },
        {
          name: 'created_at',
          type: 'timestamp',
          isNullable: false,
          isPrimaryKey: false,
          defaultValue: 'now()',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'columns',
  });

  useEffect(() => {
    if (state.success && state.tableName && open) {
      onCreated(state.tableName);
      form.reset();
    }
  }, [state.success, state.tableName, open, onCreated, form]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetClassName}>
        <div className="shrink-0 border-b bg-muted/30 px-6 py-3 pr-12">
          <SheetTitle>Create a new table</SheetTitle>
          <SheetDescription className="mt-1">
            Define your table name and columns. Defaults:{' '}
            <span className="font-mono">id</span> +{' '}
            <span className="font-mono">created_at</span>.
          </SheetDescription>
        </div>

        {state.error && (
          <p className="shrink-0 px-6 pt-3 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <form
          action={formAction}
          noValidate
          onSubmitCapture={async (e) => {
            const formEl = e.currentTarget;

            const ok = await form.trigger(undefined, { shouldFocus: true });
            if (!ok) {
              e.preventDefault();
              return;
            }

            const values = form.getValues();
            const nameInput = formEl.elements.namedItem(
              'name',
            ) as HTMLInputElement;
            const columnsInput = formEl.elements.namedItem(
              'columns',
            ) as HTMLInputElement;

            if (nameInput) nameInput.value = values.name;
            if (columnsInput) {
              columnsInput.value = JSON.stringify(values.columns);
            }
          }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <input type="hidden" name="name" defaultValue="" />
          <input type="hidden" name="columns" defaultValue="[]" />

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              <FieldGroup>
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="table-name">Name</FieldLabel>
                      <Input
                        {...field}
                        id="table-name"
                        placeholder="table_name"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="min-w-0">
                <p className="mb-3 text-sm font-medium">Columns</p>

                {/* Desktop: column grid constrained to drawer width */}
                <div className="hidden w-full min-w-0 md:block">
                  <div className="mb-2 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_72px_40px_40px_minmax(0,1fr)_minmax(0,1fr)_28px] gap-2">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <span className="text-xs text-muted-foreground">Type</span>
                    <span className="text-xs text-muted-foreground">
                      Default
                    </span>
                    <span className="text-center text-xs text-muted-foreground">
                      PK
                    </span>
                    <span className="text-center text-xs text-muted-foreground">
                      Null
                    </span>
                    <span className="text-xs text-muted-foreground">
                      FK table
                    </span>
                    <span className="text-xs text-muted-foreground">
                      FK column
                    </span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <ColumnRowDesktop
                        key={field.id}
                        index={index}
                        control={form.control}
                        existingTables={existingTables}
                        canRemove={fields.length > 1}
                        onRemove={() => remove(index)}
                      />
                    ))}
                  </div>
                </div>

                {/* Mobile: stacked cards */}
                <div className="space-y-3 md:hidden">
                  {fields.map((field, index) => (
                    <ColumnRowMobile
                      key={field.id}
                      index={index}
                      control={form.control}
                      existingTables={existingTables}
                      canRemove={fields.length > 1}
                      onRemove={() => remove(index)}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full max-w-full"
                  onClick={() =>
                    append({
                      name: '',
                      type: 'text',
                      isNullable: true,
                      isPrimaryKey: false,
                      defaultValue: '',
                      foreignKeyTable: '',
                      foreignKeyColumn: '',
                    })
                  }
                >
                  <Plus size={14} className="mr-1.5" />
                  Add column
                </Button>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-6 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              name="intent"
              value={TABLE_EDITOR_INTENT.CREATE_TABLE}
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Create table'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ColumnRowDesktop({
  index,
  control,
  existingTables,
  canRemove,
  onRemove,
}: {
  index: number;
  control: ReturnType<typeof useForm<CreateTableValues>>['control'];
  existingTables: string[];
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_72px_40px_40px_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-2">
      <Controller
        name={`columns.${index}.name`}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="min-w-0">
            <Input
              {...field}
              className="h-8 min-w-0 font-mono text-xs"
              placeholder="column_name"
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />

      <ColumnTypeSelect index={index} control={control} />
      <ColumnDefaultInput index={index} control={control} />
      <ColumnCheckbox index={index} control={control} name="isPrimaryKey" />
      <ColumnCheckbox index={index} control={control} name="isNullable" />
      <ColumnFkTableSelect
        index={index}
        control={control}
        existingTables={existingTables}
      />
      <ColumnFkColumnInput index={index} control={control} />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={!canRemove}
      >
        <Trash2 size={12} />
      </Button>
    </div>
  );
}

function ColumnRowMobile({
  index,
  control,
  existingTables,
  canRemove,
  onRemove,
}: {
  index: number;
  control: ReturnType<typeof useForm<CreateTableValues>>['control'];
  existingTables: string[];
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Column {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 size={12} />
        </Button>
      </div>

      <Controller
        name={`columns.${index}.name`}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className="text-xs">Name</FieldLabel>
            <Input
              {...field}
              className="h-9 font-mono text-xs"
              placeholder="column_name"
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel className="mb-1.5 text-xs">Type</FieldLabel>
          <ColumnTypeSelect index={index} control={control} />
        </div>
        <div>
          <FieldLabel className="mb-1.5 text-xs">Default</FieldLabel>
          <ColumnDefaultInput index={index} control={control} />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-xs">
          <ColumnCheckbox index={index} control={control} name="isPrimaryKey" />
          Primary key
        </label>
        <label className="flex items-center gap-2 text-xs">
          <ColumnCheckbox index={index} control={control} name="isNullable" />
          Nullable
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel className="mb-1.5 text-xs">FK table</FieldLabel>
          <ColumnFkTableSelect
            index={index}
            control={control}
            existingTables={existingTables}
          />
        </div>
        <div>
          <FieldLabel className="mb-1.5 text-xs">FK column</FieldLabel>
          <ColumnFkColumnInput index={index} control={control} />
        </div>
      </div>
    </div>
  );
}

function ColumnTypeSelect({
  index,
  control,
}: {
  index: number;
  control: ReturnType<typeof useForm<CreateTableValues>>['control'];
}) {
  return (
    <Controller
      name={`columns.${index}.type`}
      control={control}
      render={({ field }) => (
        <Select
          value={field.value}
          onValueChange={(v) => field.onChange(v as ColumnType)}
        >
          <SelectTrigger className="h-8 w-full min-w-0 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMN_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="font-mono text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

function ColumnDefaultInput({
  index,
  control,
}: {
  index: number;
  control: ReturnType<typeof useForm<CreateTableValues>>['control'];
}) {
  return (
    <Controller
      name={`columns.${index}.defaultValue`}
      control={control}
      render={({ field }) => (
        <Input
          {...field}
          className="h-8 w-full min-w-0 font-mono text-xs"
          placeholder="NULL"
        />
      )}
    />
  );
}

function ColumnCheckbox({
  index,
  control,
  name,
}: {
  index: number;
  control: ReturnType<typeof useForm<CreateTableValues>>['control'];
  name: 'isPrimaryKey' | 'isNullable';
}) {
  return (
    <Controller
      name={`columns.${index}.${name}`}
      control={control}
      render={({ field }) => (
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      )}
    />
  );
}

function ColumnFkTableSelect({
  index,
  control,
  existingTables,
}: {
  index: number;
  control: ReturnType<typeof useForm<CreateTableValues>>['control'];
  existingTables: string[];
}) {
  return (
    <Controller
      name={`columns.${index}.foreignKeyTable`}
      control={control}
      render={({ field }) => (
        <Select
          value={field.value ?? ''}
          onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
        >
          <SelectTrigger className="h-8 w-full min-w-0 text-xs">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {existingTables.map((t) => (
              <SelectItem key={t} value={t} className="font-mono text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

function ColumnFkColumnInput({
  index,
  control,
}: {
  index: number;
  control: ReturnType<typeof useForm<CreateTableValues>>['control'];
}) {
  return (
    <Controller
      name={`columns.${index}.foreignKeyColumn`}
      control={control}
      render={({ field }) => (
        <Input
          {...field}
          className="h-8 w-full min-w-0 font-mono text-xs"
          placeholder="id"
        />
      )}
    />
  );
}