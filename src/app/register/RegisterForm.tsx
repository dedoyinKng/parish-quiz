"use client";

import { useActionState, useState } from "react";
import { registerParishAction } from "./actions";

type Unit = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  hasTeacher: boolean;
  hqOf?: string;
};

export default function RegisterForm({ units }: { units: Unit[] }) {
  const [state, formAction, pending] = useActionState(
    registerParishAction,
    {} as { error?: string }
  );

  const provinces = units.filter((u) => u.type === "PROVINCE");
  const [provinceId, setProvinceId] = useState(
    provinces.length === 1 ? provinces[0].id : ""
  );
  const [zoneId, setZoneId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [parishId, setParishId] = useState("");

  const isAnnex = zoneId === "ANNEX";
  const zones = units.filter((u) => u.type === "ZONE" && u.parentId === provinceId);
  const areas = units.filter((u) => u.type === "AREA" && u.parentId === zoneId);

  const parentId = isAnnex ? provinceId : areaId;
  const parishes = parentId
    ? units.filter((u) => u.type === "PARISH" && u.parentId === parentId)
    : [];
  const showParish = isAnnex ? !!provinceId : !!areaId;

  return (
    <form action={formAction} className="space-y-4">
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
            setAreaId("");
            setParishId("");
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
      </div>

      {provinceId && (
        <div>
          <label htmlFor="zoneId" className="label">
            Zone
          </label>
          <select
            id="zoneId"
            name="zoneId"
            required
            value={zoneId}
            onChange={(e) => {
              setZoneId(e.target.value);
              setAreaId("");
              setParishId("");
            }}
            className="field"
          >
            <option value="">Select...</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
            <option value="ANNEX">Annex (directly under the province)</option>
          </select>
        </div>
      )}

      {zoneId && !isAnnex && (
        <div>
          <label htmlFor="areaId" className="label">
            Area
          </label>
          <select
            id="areaId"
            name="areaId"
            required
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value);
              setParishId("");
            }}
            className="field"
          >
            <option value="">Select...</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showParish && (
        <div>
          <label htmlFor="parishId" className="label">
            Your parish
          </label>
          <select
            id="parishId"
            name="parishId"
            required
            value={parishId}
            onChange={(e) => setParishId(e.target.value)}
            className="field"
          >
            <option value="">Select...</option>
            {parishes.map((p) => (
              <option key={p.id} value={p.id} disabled={p.hasTeacher}>
                {p.name}
                {p.hqOf ? ` (HQ of ${p.hqOf})` : ""}
                {p.hasTeacher ? " (already registered)" : ""}
              </option>
            ))}
            <option value="NEW">My parish is not listed</option>
          </select>
        </div>
      )}

      {parishId === "NEW" && (
        <div>
          <label htmlFor="parishName" className="label">
            Parish name
          </label>
          <input
            id="parishName"
            name="parishName"
            required
            placeholder="e.g. Garden of Praise"
            className="field"
          />
        </div>
      )}

      <hr style={{ borderColor: "var(--line)" }} />

      <div>
        <label htmlFor="name" className="label">
          Your full name
        </label>
        <input id="name" name="name" required autoComplete="name" className="field" />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field"
        />
      </div>
      <div>
        <label htmlFor="phone" className="label">
          Phone (optional)
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className="field" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password (at least 8 characters)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
        />
      </div>

      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Registering..." : "Register my parish"}
      </button>
    </form>
  );
}