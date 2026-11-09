const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const db = new PrismaClient();

(async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) {
    throw new Error("Need ADMIN_EMAIL and an ADMIN_PASSWORD of 10+ characters");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN", active: true },
    create: { name: "Super Admin", email, passwordHash, role: "SUPER_ADMIN" },
  });
  console.log("Super admin ready:", email);

  for (const demo of ["area@demo.test", "parish@demo.test"]) {
    try {
      const r = await db.user.deleteMany({ where: { email: demo } });
      if (r.count) console.log("Deleted", demo);
    } catch {
      await db.user.updateMany({ where: { email: demo }, data: { active: false } });
      console.log("Could not delete", demo, "- deactivated instead");
    }
  }
})().catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => db.$disconnect());
