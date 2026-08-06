export default function OrganizationsListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>;
}