import { redirect } from "next/navigation";
import type { OrgUnit } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STAGE_LABEL, stageClass } from "@/lib/stage";
import AddUnitForm from "./AddUnitForm";
import ImportForm from "./ImportForm";
import UnitRowActions from "./UnitRowActions";

type Maps = {
  byParent: Map<string | null, OrgUnit[]>;
  byId: Map<string, OrgUnit>;
};

function parishesUnder(id: string, byParent: Maps["byParent"]) {
  const out: OrgUnit[] = [];
  const stack = [...(byParent.get(id) ?? [])];
  while (stack.length) {
    const u = stack.pop()!;
    if (u.type === "PARISH") out.push(u);
    else stack.push(...(byParent.get(u.id) ?? []));
  }
  return out.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
}

function Tree({
  parentId,
  maps,
  depth,
}: {
  parentId: string | null;
  maps: Maps;
  depth: number;
}) {
  const list = maps.byParent.get(parentId) ?? [];
  return (
    <ul className={depth ? "ml-2 border-l border-line pl-4" : ""}>
      {list.map((u) => {
        const hq = u.hqParishId ? maps.byId.get(u.hqParishId) : null;
        const options =
          u.type === "PARISH"
            ? []
            : parishesUnder(u.id, maps.byParent).map((p) => ({
                id: p.id,
                name: p.name,
              }));
        return (
          <li key={u.id} className={`${stageClass(u.type)} mt-2`}>
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="flag" aria-hidden />
              <span className="font-semibold">{u.name}</span>
              <span className="text-sm text-ink-soft">
                {STAGE_LABEL[u.type]} {u.code}
              </span>
              {hq && <span className="tag">HQ: {hq.name}</span>}
              <UnitRowActions
                id={u.id}
                type={u.type}
                name={u.name}
                hqId={u.hqParishId}
                hqOptions={options}
              />
            </span>
            <Tree parentId={u.id} maps={maps} depth={depth + 1} />
          </li>
        );
      })}
    </ul>
  );
}

export default async function UnitsPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const units = (await db.orgUnit.findMany()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

  const byParent = new Map<string | null, OrgUnit[]>();
  const byId = new Map<string, OrgUnit>();
  for (const u of units) {
    byId.set(u.id, u);
    const list = byParent.get(u.parentId) ?? [];
    list.push(u);
    byParent.set(u.parentId, list);
  }
  const maps: Maps = { byParent, byId };

  const count = (t: string) => units.filter((u) => u.type === t).length;
  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;

  return (
    <div className="page-narrow">
      <h1 className="text-3xl font-semibold">Hierarchy</h1>
      <p className="mt-1 text-ink-soft">
        {plural(count("PROVINCE"), "province", "provinces")},{" "}
        {plural(count("ZONE"), "zone", "zones")},{" "}
        {plural(count("AREA"), "area", "areas")} and{" "}
        {plural(count("PARISH"), "parish", "parishes")}.
      </p>

      <section className="card mt-8 p-5">
        <h2 className="text-xl font-semibold">Add a province, zone or area</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Parishes are not added here. Each parish registers itself at{" "}
          <a href="/register" className="font-semibold underline">
            /register
          </a>{" "}
          once its province, zone and area exist. After that, use{" "}
          <strong>Set HQ</strong> on a province, zone or area to name its
          headquarters parish.
        </p>
        <div className="mt-4">
          <AddUnitForm
            units={units.map((u) => ({
              id: u.id,
              type: u.type,
              name: u.name,
              parentId: u.parentId,
            }))}
          />
        </div>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-xl font-semibold">All units</h2>
        <div className="mt-2">
          {units.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing added yet.</p>
          ) : (
            <Tree parentId={null} maps={maps} depth={0} />
          )}
        </div>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-xl font-semibold">
          Bulk import from a spreadsheet (optional)
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Only needed to load many areas and parishes at once. One row per
          parish with its area, zone and province. Province and zone can be
          just the number (45, 3). Save the sheet as CSV.{" "}
          <a href="/units-template.csv" className="font-semibold underline">
            Download the template
          </a>
        </p>
        <div className="mt-4">
          <ImportForm />
        </div>
      </section>
    </div>
  );
}