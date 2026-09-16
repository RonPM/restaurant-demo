import { HOST } from "../lib/billing";

function getMode(assignment) {
  return assignment?.mode ?? "single";
}

export default function ItemAssignment({ item, people, assignment, onChange }) {
  const mode = getMode(assignment);
  const canSplitUnits = item.quantity > 1;

  const singlePersonId = mode === "single" ? (assignment?.personId ?? HOST.id) : HOST.id;
  const sharedPeopleIds = mode === "shared" ? assignment.peopleIds : [];
  const units = mode === "units" ? assignment.units : {};
  const assignedUnits = Object.values(units).reduce((a, b) => a + b, 0);

  function setMode(nextMode) {
    if (nextMode === "single") {
      onChange({ mode: "single", personId: HOST.id });
    } else if (nextMode === "shared") {
      onChange({ mode: "shared", peopleIds: [HOST.id] });
    } else if (nextMode === "units") {
      onChange({ mode: "units", units: {} });
    }
  }

  function toggleShared(personId) {
    const set = new Set(sharedPeopleIds);
    if (set.has(personId)) {
      set.delete(personId);
    } else {
      set.add(personId);
    }
    const next = Array.from(set);
    if (next.length === 0) return;
    onChange({ mode: "shared", peopleIds: next });
  }

  function changeUnit(personId, delta) {
    const current = units[personId] || 0;
    const nextCount = current + delta;
    if (nextCount < 0) return;
    if (delta > 0 && assignedUnits >= item.quantity) return;
    const nextUnits = { ...units, [personId]: nextCount };
    if (nextCount === 0) delete nextUnits[personId];
    onChange({ mode: "units", units: nextUnits });
  }

  return (
    <div className="assign">
      <div className="assign-mode-row">
        <button
          type="button"
          className={`assign-mode-btn ${mode === "single" ? "active" : ""}`}
          onClick={() => setMode("single")}
        >
          One person
        </button>
        <button
          type="button"
          className={`assign-mode-btn ${mode === "shared" ? "active" : ""}`}
          onClick={() => setMode("shared")}
        >
          Split equally
        </button>
        {canSplitUnits && (
          <button
            type="button"
            className={`assign-mode-btn ${mode === "units" ? "active" : ""}`}
            onClick={() => setMode("units")}
          >
            By unit
          </button>
        )}
      </div>

      {mode === "single" && (
        <div className="assign-chip-row">
          {people.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`assign-chip ${singlePersonId === p.id ? "active" : ""}`}
              onClick={() => onChange({ mode: "single", personId: p.id })}
            >
              {p.displayName}
            </button>
          ))}
        </div>
      )}

      {mode === "shared" && (
        <div className="assign-checkbox-row">
          {people.map((p) => (
            <label key={p.id} className="assign-checkbox-label">
              <input
                type="checkbox"
                checked={sharedPeopleIds.includes(p.id)}
                onChange={() => toggleShared(p.id)}
              />
              {p.displayName}
            </label>
          ))}
        </div>
      )}

      {mode === "units" && (
        <div className="assign-units">
          {people.map((p) => (
            <div key={p.id} className="assign-unit-row">
              <span className="assign-unit-name">{p.displayName}</span>
              <div className="assign-unit-controls">
                <button
                  type="button"
                  className="assign-unit-btn"
                  onClick={() => changeUnit(p.id, -1)}
                  disabled={(units[p.id] || 0) <= 0}
                >
                  −
                </button>
                <span className="assign-unit-count">{units[p.id] || 0}</span>
                <button
                  type="button"
                  className="assign-unit-btn"
                  onClick={() => changeUnit(p.id, 1)}
                  disabled={assignedUnits >= item.quantity}
                >
                  +
                </button>
              </div>
            </div>
          ))}
          <p className={`assign-unit-remaining ${assignedUnits < item.quantity ? "assign-unit-remaining--pending" : ""}`}>
            {assignedUnits} of {item.quantity} assigned{assignedUnits < item.quantity ? " (rest billed to host)" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
