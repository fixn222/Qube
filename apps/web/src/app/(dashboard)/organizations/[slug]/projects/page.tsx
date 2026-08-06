import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  retrieveOrgsBySlugFromApi,
  retriveMyOrgsFromApi,
} from "@/features/organization/organization-helpers";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await retrieveOrgsBySlugFromApi(slug);

  // console.log(org);
  // console.log(slug);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium">Projects</h1>
        <Button size="sm">
          <Plus size={14} className="mr-1.5" />
          New project
        </Button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
        <p className="text-muted-foreground text-sm">
          No projects yet in {org.name}
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Create your first project to get started
        </p>
      </div>
    </div>
  );
}
