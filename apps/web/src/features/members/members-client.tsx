'use client';

import { useActionState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ORG_ROLES } from '@qube/constants';
import { OrgMemberWithUser, OrgRole } from '@qube/types';
import { membersAction } from '@/features/members/actions';
import { Controller, useForm } from 'react-hook-form';
import z from 'zod';
import { inviteSchema } from '@/features/members/client.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { MEMBERS_INTENT } from './constants';
import { Badge } from '@/components/ui/badge';

interface MembersClientProps {
  slug: string;
  members: OrgMemberWithUser[];
  currentUserRole: OrgRole;
}

export function MembersClient({
  currentUserRole,
  members,
  slug,
}: MembersClientProps) {
  const isAdmin = currentUserRole === ORG_ROLES.ADMIN;
  const boundAction = membersAction.bind(null, { slug });
  const [state, formAction, isPending] = useActionState(boundAction, {});

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  return (
    <div className="space-y-6">
      {/* ── Invite form — admin only ─────────────────────────────── */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite a member</CardTitle>
          </CardHeader>
          <CardContent>
            {state.error && (
              <p className="text-sm text-destructive mb-3">{state.error}</p>
            )}
            {state.success && (
              <p className="text-sm text-green-600 mb-3">{state.success}</p>
            )}
            <form
              action={formAction}
              noValidate
              onSubmitCapture={async (e) => {
                const ok = await form.trigger(undefined, { shouldFocus: true });
                if (!ok) e.preventDefault();
              }}
              className="flex gap-2"
            >
              <FieldGroup className="flex-1">
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <Input
                        {...field}
                        type="email"
                        placeholder="colleague@example.com"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              <Button
                type="submit"
                name="intent"
                value={MEMBERS_INTENT.INVITE}
                disabled={isPending}
              >
                Send invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Members list ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {members.length} {members.length === 1 ? 'member' : 'members' }
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback>
                    {(member.user.name ?? member.user.email)
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {member.user.name ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* role badge / selector */}
                {isAdmin ? (
                  <form action={formAction}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <Select
                      name="role"
                      defaultValue={member.role}
                      onValueChange={(value) => {
                        const form = document.createElement('form');
                        // handled by the select's own form submission below
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ORG_ROLES.ADMIN}>Admin</SelectItem>
                        <SelectItem value={ORG_ROLES.DEVELOPER}>
                          Developer
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="submit"
                      name="intent"
                      value={MEMBERS_INTENT.UPDATE_ROLE}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs mt-2"
                      disabled={isPending}
                    >
                      Save
                    </Button>
                  </form>
                ) : (
                  <Badge variant="secondary" className="capitalize">
                    {member.role}
                  </Badge>
                )}

                {/* remove button — admin only, can't remove self */}
                {isAdmin && (
                  <form action={formAction}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <Button
                      type="submit"
                      name="intent"
                      value={MEMBERS_INTENT.REMOVE}
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs text-destructive hover:text-destructive mb-10"
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}