import { PrismaClient, type OrgType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function unit(
  type: OrgType,
  name: string,
  code: string,
  parentId: string | null
) {
  return prisma.orgUnit.upsert({
    where: { code },
    update: { name },
    create: { type, name, code, parentId },
  });
}

async function main() {
  const province = await unit("PROVINCE", "Demo Province", "PRV-01", null);
  const zone = await unit("ZONE", "Demo Zone 1", "ZN-01", province.id);
  const area = await unit("AREA", "Demo Area 1", "AR-01", zone.id);
  const parishA = await unit("PARISH", "Demo Parish A", "PAR-001", area.id);
  await unit("PARISH", "Demo Parish B", "PAR-002", area.id);

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Super Admin", email, passwordHash, role: "SUPER_ADMIN" },
  });

    // Demo accounts for testing role scoping. Delete these before real use.
  const demoHash = await bcrypt.hash("Demo12345", 10);
  await prisma.user.upsert({
    where: { email: "area@demo.test" },
    update: {},
    create: {
      name: "Demo Area Coordinator",
      email: "area@demo.test",
      passwordHash: demoHash,
      role: "AREA_COORDINATOR",
      orgUnitId: area.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "parish@demo.test" },
    update: {},
    create: {
      name: "Demo Parish Teacher",
      email: "parish@demo.test",
      passwordHash: demoHash,
      role: "PARISH_TEACHER",
      orgUnitId: parishA.id,
    },
  });

  // Placeholder date: replace with the real age reference date for the season
  await prisma.season.upsert({
    where: { name: "2026" },
    update: {},
    create: { name: "2026", ageReferenceDate: new Date("2026-12-31") },
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
