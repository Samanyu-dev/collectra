import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await requireUser();
  const [user, instanceCount, wishlistCount, activeProjectCount, migrationCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: currentUser.id } }),
    prisma.instance.count({ where: { userId: currentUser.id } }),
    prisma.wishlist.count({ where: { userId: currentUser.id } }),
    prisma.project.count({ where: { userId: currentUser.id, status: "ACTIVE" } }),
    prisma.migrationSession.count({ where: { userId: currentUser.id } }),
  ]);

  return (
    <SettingsClient
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              username: user.username,
              bio: user.bio,
              avatarUrl: user.avatarUrl,
              isPublic: user.isPublic,
              showValuePublicly: user.showValuePublicly,
            }
          : null
      }
      stats={{ instanceCount, wishlistCount, activeProjectCount, migrationCount }}
    />
  );
}
