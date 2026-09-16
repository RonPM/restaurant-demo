import { useState } from "react";
import { getOrderHistory } from "../lib/orderHistory";
import { formatCurrency } from "../lib/billing";

export default function OrderHistory() {
  const [history] = useState(getOrderHistory);
  const [expandedId, setExpandedId] = useState(null);

  return (
    <main className="history-view">
      <h2>Order history</h2>

      {history.length === 0 ? (
        <p className="cart-empty">No past orders yet.</p>
      ) : (
        <ul className="history-list">
          {history.map((order) => {
            const isExpanded = expandedId === order.id;
            const date = new Date(order.timestamp).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li key={order.id} className="history-row">
                <button
                  className="history-row-header"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <span className="history-row-id">{order.id}</span>
                  <span className="history-row-date">{date}</span>
                  <span className="history-row-total">{formatCurrency(order.orderTotal)}</span>
                </button>
                {isExpanded && (
                  <div className="history-row-expanded">
                    {order.breakdown ? (
                      <ul className="modal-split-list">
                        {order.breakdown.map((row) => (
                          <li className="modal-split-row history-breakdown-row" key={row.personId}>
                            <span className="modal-split-name">{row.displayName}</span>
                            <span className="modal-split-sub">
                              {formatCurrency(row.subtotal)} + {formatCurrency(row.tax)} tax
                            </span>
                            <span className="modal-split-total">{formatCurrency(row.roundedTotal)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="history-no-split">No split was configured for this order.</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
