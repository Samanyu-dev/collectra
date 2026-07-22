import { prisma } from "../ingestion/engine/prisma";
import { attachHotlinkImage } from "../ingestion/engine/media";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A handful of club names don't match TheSportsDB's canonical naming — map them explicitly.
const NAME_OVERRIDES: Record<string, string> = {
  "FC Barcelona": "Barcelona",
  "Real Madrid CF": "Real Madrid",
  "Atlético de Madrid": "Atletico Madrid",
  "FC Bayern München": "Bayern Munich",
  "Bayer 04 Leverkusen": "Bayer Leverkusen",
  "Eintracht Frankfurt": "Eintracht Frankfurt",
  "Borussia Dortmund": "Borussia Dortmund",
  "Sporting Clube de Portugal": "Sporting CP",
  "SL Benfica": "Benfica",
  "AFC Ajax": "Ajax",
  "Paris Saint-Germain": "Paris SG",
  "SSC Napoli": "Napoli",
  "FC Internazionale Milano": "Inter Milan",
  "Bologna FC 1909": "Bologna",
  "ACF Fiorentina": "Fiorentina",
  "FC Salzburg": "Red Bull Salzburg",
  "Celtic FC": "Celtic",
  "Athletic Club": "Athletic Bilbao",
  "Rangers FC": "Rangers",
  "FC Porto": "Porto",
  "Manchester City": "Manchester City",
  "Tottenham Hotspur": "Tottenham Hotspur",
};

async function findBadge(teamName: string): Promise<string | null> {
  const query = NAME_OVERRIDES[teamName] || teamName;
  const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const team = data?.teams?.[0];
  return team?.strBadge || null;
}

async function main() {
  const teams = await prisma.team.findMany({ include: { cards: { select: { id: true } } } });
  console.log(`Found ${teams.length} teams.`);

  let matched = 0;
  let unmatched: string[] = [];

  for (const team of teams) {
    const badgeUrl = await findBadge(team.name);
    if (!badgeUrl) {
      unmatched.push(team.name);
      await sleep(300);
      continue;
    }

    await attachHotlinkImage({
      url: badgeUrl,
      entityType: "Team",
      entityId: team.id,
      usage: "TEAM_BADGE",
      sourceIdentifier: "thesportsdb-api",
      sourceKind: "COMMUNITY",
    });

    for (const card of team.cards) {
      await attachHotlinkImage({
        url: badgeUrl,
        entityType: "Card",
        entityId: card.id,
        usage: "TEAM_CREST",
        sourceIdentifier: "thesportsdb-api",
        sourceKind: "COMMUNITY",
      });
    }

    matched++;
    console.log(`  ✓ ${team.name} (${team.cards.length} cards)`);
    await sleep(300);
  }

  console.log(`\nDone. Matched ${matched}/${teams.length} teams.`);
  if (unmatched.length > 0) {
    console.log(`Unmatched: ${unmatched.join(", ")}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
