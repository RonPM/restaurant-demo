import { useState, useEffect, useRef } from "react";
import { computeOrderTotals, computeSplit, buildDisplayNames, buildPersonItemBreakdown, formatCurrency, HOST } from "../lib/billing";
import { saveOrder } from "../lib/orderHistory";

function generateOrderNumber() {
  return "DL-" + Math.floor(10000 + Math.random() * 90000);
}

function buildSummaryText(split, people, itemsByPerson, orderNumber) {
  const nameFor = (id) => people.find((p) => p.id === id)?.displayName ?? id;
  const lines = [`Order ${orderNumber}`, ""];
  for (const row of split.rows) {
    lines.push(`${nameFor(row.personId)}:`);
    for (const it of itemsByPerson[row.personId] || []) {
      const percentSuffix = it.percent < 100 ? ` (${Math.round(it.percent)}% of the dish)` : "";
      lines.push(`  - ${it.name}: ${formatCurrency(it.amount)}${percentSuffix}`);
    }
    lines.push(
      `  Subtotal: ${formatCurrency(row.subtotal)} + ${formatCurrency(row.tax)} tax = ${formatCurrency(row.roundedTotal)}`
    );
  }
  lines.push("", `Total: ${formatCurrency(split.orderTotal)}`);
  return lines.join("\n");
}

export default function PaymentModal({ cart, guests, assignments, onClose, onSuccess }) {
  const { subtotal, tax, total } = computeOrderTotals(cart);
  const hasGuests = guests.length > 0;
  const people = hasGuests ? buildDisplayNames([HOST, ...guests]) : [];
  const split = hasGuests ? computeSplit(cart, assignments, people) : null;
  const itemsByPerson = hasGuests ? buildPersonItemBreakdown(cart, assignments, people) : null;

  const [step, setStep] = useState("summary");
  const [orderNumber] = useState(generateOrderNumber);
  const [orderTime] = useState(() => new Date());
  const [form, setForm] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [copied, setCopied] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => setStep("success"), 2000);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success" || savedRef.current) return;
    savedRef.current = true;
    saveOrder({
      id: orderNumber,
      timestamp: orderTime.toISOString(),
      cart,
      guests,
      assignments,
      breakdown: split ? split.rows.map((row) => ({
        ...row,
        displayName: people.find((p) => p.id === row.personId)?.displayName ?? row.personId,
      })) : null,
      orderTotal: total,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function handleOverlayClick() {
    if (step !== "processing") onClose();
  }

  function handleNumberChange(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
    setForm((f) => ({ ...f, number: formatted }));
  }

  function handleExpiryChange(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    const formatted = raw.length > 2 ? raw.slice(0, 2) + "/" + raw.slice(2) : raw;
    setForm((f) => ({ ...f, expiry: formatted }));
  }

  async function copySummary() {
    if (!split) return;
    const text = buildSummaryText(split, people, itemsByPerson, orderNumber);

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    } catch {
      // Clipboard API unavailable or blocked (e.g. document not focused, no permission) — fall back below.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let fellBack = false;
    try {
      fellBack = document.execCommand("copy");
    } catch {
      fellBack = false;
    }
    document.body.removeChild(textarea);

    if (fellBack) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      window.prompt("Copy this summary manually:", text);
    }
  }

  const canPay =
    form.name.trim() &&
    form.number.replace(/\s/g, "").length === 16 &&
    form.expiry.length === 5 &&
    form.cvv.length >= 3;

  const formattedTime = orderTime.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function nameFor(id) {
    return people.find((p) => p.id === id)?.displayName ?? id;
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {step === "summary" && (
          <div className="modal-step">
            <h2 className="modal-title">Order Summary</h2>
            <ul className="modal-item-list">
              {cart.map((item, i) => (
                <li key={i} className="modal-item-row">
                  <span className="modal-item-emoji">{item.emoji}</span>
                  <span className="modal-item-name">{item.name}</span>
                  <span className="modal-item-qty">x{item.quantity}</span>
                  <span className="modal-item-price">{formatCurrency(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="modal-totals">
              <div className="modal-totals-row">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="modal-totals-row">
                <span>Tax (10%)</span><span>{formatCurrency(tax)}</span>
              </div>
              <div className="modal-totals-row modal-totals-total">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>

            {split && (
              <div className="modal-split">
                <h3 className="modal-split-title">Split between {people.length} people</h3>
                <ul className="modal-split-list">
                  {split.rows.map((row) => (
                    <li className="modal-split-row" key={row.personId}>
                      <span className="modal-split-name">{nameFor(row.personId)}</span>
                      <span className="modal-split-sub">
                        {formatCurrency(row.subtotal)} + {formatCurrency(row.tax)} tax
                      </span>
                      <span className="modal-split-total">{formatCurrency(row.roundedTotal)}</span>
                    </li>
                  ))}
                </ul>
                <button className="modal-btn-secondary modal-btn-full" onClick={copySummary}>
                  {copied ? "Copied!" : "Copy summary"}
                </button>
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={onClose}>Cancel</button>
              <button className="modal-btn-primary" onClick={() => setStep("card")}>
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {step === "card" && (
          <div className="modal-step">
            <h2 className="modal-title">Payment Details</h2>
            <div className="card-form">
              <label className="card-label">
                Name on card
                <input
                  className="card-input"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="card-label">
                Card number
                <input
                  className="card-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={form.number}
                  onChange={handleNumberChange}
                />
              </label>
              <div className="card-row">
                <label className="card-label">
                  Expiry
                  <input
                    className="card-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={form.expiry}
                    onChange={handleExpiryChange}
                  />
                </label>
                <label className="card-label">
                  CVV
                  <input
                    className="card-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    maxLength={4}
                    value={form.cvv}
                    onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setStep("summary")}>Back</button>
              <button
                className="modal-btn-primary"
                disabled={!canPay}
                onClick={() => setStep("processing")}
              >
                Pay {formatCurrency(total)}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="modal-step modal-step-centered">
            <div className="spinner" />
            <p className="processing-title">Processing your payment…</p>
            <p className="processing-subtitle">Please do not close this window.</p>
          </div>
        )}

        {step === "success" && (
          <div className="modal-step modal-step-centered">
            <div className="success-icon">✓</div>
            <h2 className="success-title">Payment Successful!</h2>
            <p className="success-meta">Order {orderNumber} · {formattedTime}</p>
            <ul className="modal-item-list modal-item-list--receipt">
              {cart.map((item, i) => (
                <li key={i} className="modal-item-row">
                  <span className="modal-item-emoji">{item.emoji}</span>
                  <span className="modal-item-name">{item.name}</span>
                  <span className="modal-item-qty">x{item.quantity}</span>
                  <span className="modal-item-price">{formatCurrency(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="modal-totals">
              <div className="modal-totals-row modal-totals-total">
                <span>Total paid</span><span>{formatCurrency(total)}</span>
              </div>
            </div>

            {split && (
              <div className="modal-split modal-split--receipt">
                <h3 className="modal-split-title">Split between {people.length} people</h3>
                <ul className="modal-split-list">
                  {split.rows.map((row) => (
                    <li className="modal-split-row modal-split-row--receipt" key={row.personId}>
                      <div className="modal-split-row-header">
                        <span className="modal-split-name">{nameFor(row.personId)}</span>
                        <span className="modal-split-total">{formatCurrency(row.roundedTotal)}</span>
                      </div>
                      <ul className="modal-split-items">
                        {(itemsByPerson[row.personId] || []).map((it, i) => (
                          <li key={i} className="modal-split-item">
                            <span>{it.name}{it.percent < 100 ? ` (${Math.round(it.percent)}%)` : ""}</span>
                            <span>{formatCurrency(it.amount)}</span>
                          </li>
                        ))}
                      </ul>
                      <span className="modal-split-sub">
                        {formatCurrency(row.subtotal)} + {formatCurrency(row.tax)} tax
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button className="modal-btn-primary modal-btn-full" onClick={onSuccess}>
              Start New Order
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
