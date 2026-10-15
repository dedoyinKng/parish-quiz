"use client";

import { useActionState, useState } from "react";
import { addStructureAction } from "./structure-actions";

type Unit = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
};

export default function AddUnitForm({ units }: { units: Unit[] }) {
  const [state, formAction, pending] = useActionState(
    addStructureAction,
    {} as { error?: string; ok?: string }
  );

  const provinces = units.filter((u) => u.type === "PROVINCE");
  const [type, setType] = useState("ZONE");
  const [provinceId, setProvinceId] = useState(
    provinces.length === 1 ? provinces[0].id : ""
  );
  const [zoneId, setZoneId] = useState("");

  const zones = units.filter((u) => u.type === "ZONE" && u.parentId === provinceId);
  const label = type === "PROVINCE" ? "Province" : type === "ZONE" ? "Zone" : "Area";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="type" className="label">
          What are you adding?
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="field"
        >
          <option value="PROVINCE">Province</option>
          <option value="ZONE">Zone</option>
          <option value="AREA">Area</option>
        </select>
      </div>

      {type !== "PROVINCE" && (
        <div>
          <label htmlFor="provinceId" className="label">
            Province
          </label>
          <select
            id="provinceId"
            name="provinceId"
            required
            value={provinceId}
            onChange={(e) => {
              setProvinceId(e.target.value);
              setZoneId("");
            }}
            className="field"
          >
            <option value="">Select...</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {provinces.length === 0 && (
            <p className="muted mt-1">No province yet. Add the province first.</p>
          )}
        </div>
      )}

      {type === "AREA" && (
        <div>
          <label htmlFor="zoneId" className="label">
            Zone
          </label>
          <select
            id="zoneId"
            name="zoneId"
            required
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="field"
          >
            <option value="">Select...</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div key={state.ok ?? "number"}>
        <label htmlFor="number" className="label">
          {label} number
        </label>
        <input
          id="number"
          name="number"
          type="number"
          min={1}
          step={1}
          required
          placeholder={type === "PROVINCE" ? "e.g. 45" : type === "ZONE" ? "e.g. 3" : "e.g. 14"}
          className="field"
        />
      </div>

      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      {state.ok && <p className="notice">{state.ok}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Adding..." : `Add ${label.toLowerCase()}`}
      </button>
    </form>
  );
}