'use client';

import { useActionState, useState } from 'react';
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
  const boundAction = projectAction.bind(null, { slug });
  const [state, formAction, isPending] = useActionState(boundAction, {});

  const form = useForm<CreateProjectValues>({
    resolver: zodResolver(createProjectScema),
    defaultValues: { name: '' },
  });

  // close modal on success
  if (state.success && open) {
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger >
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
          noValidate
          onSubmitCapture={async (e) => {
            const ok = await form.trigger(undefined, { shouldFocus: true });
            if (!ok) e.preventDefault();
          }}
          className="space-y-4"
        >
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