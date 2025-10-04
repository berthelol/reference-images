import Link from "next/link";

export default function AdminPage() {
  const adminPages = [
    {
      href: "/admin/images" as const,
      title: "Images",
      description: "Manage images and uploads",
    },
    {
      href: "/admin/tags" as const,
      title: "Tags",
      description: "Manage tags and categories",
    },
  ] as const;

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Admin</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="block p-8 border rounded-lg hover:bg-accent transition-colors"
          >
            <h2 className="text-2xl font-semibold mb-2">{page.title}</h2>
            <p className="text-muted-foreground">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
