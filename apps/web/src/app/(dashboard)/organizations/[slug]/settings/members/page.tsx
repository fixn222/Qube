import { MembersClient } from '@/features/members/members-client';
import { retrieveMembersFromApi } from '@/features/members/members-helpers.server';
import { retrieveOrgsBySlugFromApi } from '@/features/organization/organization-helpers';
import { sl } from 'zod/locales';

export default async function MembersSettingsPage({
    params ,
} : {params : Promise<{slug : string}>}) {

    const {slug} = await params ;
    const [org , members] = await Promise.all([
        retrieveOrgsBySlugFromApi(slug) ,
        retrieveMembersFromApi(slug)
    ]);

    // console.log(members)


  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-medium">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who has access to {'ORGANIZATION NAME'}
        </p>
      </div>
      <MembersClient slug={slug} members={members} currentUserRole={org.role}/>
    </div>
  );
}