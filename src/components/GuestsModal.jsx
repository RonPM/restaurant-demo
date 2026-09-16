import { useState } from "react";
import { HOST, buildDisplayNames } from "../lib/billing";

const MAX_GUESTS = 20;

export default function GuestsModal({ guests, onAddGuest, onRemoveGuest, onClose }) {
  const [name, setName] = useState("");
  const people = buildDisplayNames([HOST, ...guests]);
  const atMax = guests.length >= MAX_GUESTS;

  function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || atMax) return;
    onAddGuest(trimmed);
    setName("");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Manage guests</h2>

        <ul className="guest-list">
          {people.map((p) => (
            <li key={p.id} className={`guest-row ${p.id === HOST.id ? "guest-row--host" : ""}`}>
              <span className="guest-name">{p.displayName}</span>
              {p.id !== HOST.id && (
                <button className="remove-btn" onClick={() => onRemoveGuest(p.id)}>✕</button>
              )}
            </li>
          ))}
        </ul>

        <form className="guest-add-row" onSubmit={handleAdd}>
          <input
            className="card-input"
            type="text"
            placeholder="Guest name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={atMax}
          />
          <button className="modal-btn-primary" type="submit" disabled={atMax || !name.trim()}>
            Add
          </button>
        </form>
        {atMax && <p className="guest-max-hint">Maximum of {MAX_GUESTS} guests reached.</p>}

        <div className="modal-actions">
          <button className="modal-btn-primary modal-btn-full" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
