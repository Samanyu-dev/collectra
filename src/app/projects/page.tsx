import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { ProjectsClient } from "./projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { id: "desc" },
    include: {
      targetSet: true,
      targets: true,
    },
  });

  const items = projects.map((p) => {
    const total = p.targets.length;
    const met = p.targets.filter((t) => t.isMet).length;
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      status: p.status,
      setName: p.targetSet?.name ?? null,
      cardsAcquired: met,
      cardsNeeded: total - met,
      total,
      progress: total > 0 ? Math.round((met / total) * 100) : 0,
    };
  });

  // Sets with real data, available to start a new completion project against
  const availableSets = await prisma.set.findMany({
    where: { cards: { some: {} } },
    select: { id: true, name: true, _count: { select: { cards: true } } },
    orderBy: { name: "asc" },
    take: 100,
  });

  return <ProjectsClient projects={items} availableSets={availableSets} />;
}
