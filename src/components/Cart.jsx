import { computeOrderTotals, formatCurrency, buildDisplayNames, HOST } from "../lib/billing";
import ItemAssignment from "./ItemAssignment";

export default function Cart({ cart, onRemove, onCheckout, guests, assignments, onManageGuests, onUpdateAssignment }) {
  const { subtotal, tax, total } = computeOrderTotals(cart);
  const hasGuests = guests.length > 0;
  const people = hasGuests ? buildDisplayNames([HOST, ...guests]) : [];

  return (
    <aside className="cart">
      <div className="cart-header-row">
        <h2>Your Order</h2>
        <button className="manage-guests-btn" onClick={onManageGuests}>
          Manage guests
          {hasGuests && <span className="guest-count-badge">{guests.length}</span>}
        </button>
      </div>

      {cart.length === 0 ? (
        <p className="cart-empty">No items yet.</p>
      ) : (
        <ul className="cart-list">
          {cart.map((item, index) => (
            <li key={index} className="cart-item">
              <div className="cart-item-row">
                <span className="cart-item-emoji">{item.emoji}</span>
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-qty">x{item.quantity}</span>
                </div>
                <span className="cart-item-price">{formatCurrency(item.price * item.quantity)}</span>
                <button className="remove-btn" onClick={() => onRemove(item.id)}>✕</button>
              </div>
              {hasGuests && (
                <ItemAssignment
                  item={item}
                  people={people}
                  assignment={assignments[item.id]}
                  onChange={(next) => onUpdateAssignment(item.id, next)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="cart-totals">
        <div className="cart-totals-row">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="cart-totals-row">
          <span>Tax (10%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="cart-totals-row total">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <button
        className="checkout-btn"
        disabled={cart.length === 0}
        onClick={onCheckout}
      >
        Place Order
      </button>
    </aside>
  );
}
