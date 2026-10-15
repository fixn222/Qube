'use client';

import { useActionState, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import z from 'zod';
import { createProjectScema } from './client.schema';
import { projectAction } from './action';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PROJECT_INTENT } from './constants';

interface CreateProjectModalProps {
  slug: string;
}

type CreateProjectValues = z.infer<typeof createProjectScema>;

export function CreateProjectModal({ slug }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [hidePreviousError, setHidePreviousError] = useState(true);
  const boundAction = projectAction.bind(null, { slug });
  const [state, formAction, isPending] = useActionState(boundAction, {});

  const form = useForm<CreateProjectValues>({
    resolver: zodResolver(createProjectScema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (state.success && open) {
      const closeDialog = window.setTimeout(() => {
        setOpen(false);
        form.reset();
      }, 0);
      return () => window.clearTimeout(closeDialog);
    }
  }, [form, open, state]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setHidePreviousError(true);
        if (!nextOpen) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus size={14} className="mr-1.5" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogDescription>
            Each project gets its own database schema, URL, and API keys.
          </DialogDescription>
        </DialogHeader>

        <form
          action={formAction}
          aria-describedby={
            state.error && !hidePreviousError ? 'project-create-error' : undefined
          }
          noValidate
          onSubmitCapture={async (e) => {
            const ok = await form.trigger(undefined, { shouldFocus: true });
            if (!ok) {
              e.preventDefault();
              return;
            }
            setHidePreviousError(false);
          }}
          className="space-y-4"
        >
          {state.error && !hidePreviousError && (
            <p
              id="project-create-error"
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                  <Input
                    {...field}
                    id="project-name"
                    placeholder="my-project"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              name="intent"
              value={PROJECT_INTENT.CREATE}
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Create project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
