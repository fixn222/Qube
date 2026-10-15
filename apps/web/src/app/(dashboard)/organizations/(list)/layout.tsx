export default function OrganizationsListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </main>
  );
}
