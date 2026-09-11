'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { organizationAction } from './actions';
import { createOrganizationSchema } from './client.schema';
import { ORGANIZATION_INTENT } from './constants';

type CreateOrganizationValues = z.infer<typeof createOrganizationSchema>;

export function CreateOrganizationForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(organizationAction, {});
  const form = useForm<CreateOrganizationValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (state.success) router.push('/organizations');
  }, [router, state.success]);

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6">
        <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
          <Building2 size={18} className="text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-medium">Create an organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organizations help you group projects and team members.
        </p>
      </div>

      <form
        action={formAction}
        noValidate
        onSubmitCapture={async (event) => {
          const valid = await form.trigger(undefined, { shouldFocus: true });
          if (!valid) event.preventDefault();
        }}
        className="space-y-4"
      >
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="organization-name">Organization name</FieldLabel>
                <Input
                  {...field}
                  id="organization-name"
                  placeholder="Acme Inc."
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/organizations')}>
            Cancel
          </Button>
          <Button type="submit" name="intent" value={ORGANIZATION_INTENT.CREATE} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create organization'}
          </Button>
        </div>
      </form>
    </div>
  );
}

