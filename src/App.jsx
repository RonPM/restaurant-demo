import { useState } from "react";
import { dishes, deliveryInfo } from "./data";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import PaymentModal from "./components/PaymentModal";
import GuestsModal from "./components/GuestsModal";
import OrderHistory from "./components/OrderHistory";
import { HOST } from "./lib/billing";
import "./App.css";

const MAX_GUESTS = 20;

export default function App() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showPayment, setShowPayment] = useState(false);
  const [guests, setGuests] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [showGuestsModal, setShowGuestsModal] = useState(false);
  const [view, setView] = useState("menu");

  function addToCart(dish) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
    setAssignments((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function addGuest(name) {
    setGuests((prev) => {
      if (prev.length >= MAX_GUESTS) return prev;
      return [...prev, { id: crypto.randomUUID(), name }];
    });
  }

  function removeGuest(guestId) {
    setAssignments((prev) => {
      const next = {};
      for (const itemId in prev) {
        const a = prev[itemId];
        if (a.mode === "single" && a.personId === guestId) {
          continue;
        }
        if (a.mode === "shared" && a.peopleIds.includes(guestId)) {
          const peopleIds = a.peopleIds.filter((id) => id !== guestId);
          if (peopleIds.length === 0) continue;
          next[itemId] = { ...a, peopleIds };
          continue;
        }
        if (a.mode === "units" && guestId in a.units) {
          const units = { ...a.units };
          const orphaned = units[guestId];
          delete units[guestId];
          units[HOST.id] = (units[HOST.id] || 0) + orphaned;
          next[itemId] = { ...a, units };
          continue;
        }
        next[itemId] = a;
      }
      return next;
    });
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
  }

  function updateAssignment(itemId, next) {
    setAssignments((prev) => ({ ...prev, [itemId]: next }));
  }

  const cartCount = cart.length;

  return (
    <div className="app">
      <header className="app-header">
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <img src={`${import.meta.env.BASE_URL}deliveroo-logo.png`} alt="Deliveroo" height="36" />
          <h1>roo<span style={{color:"#1a271f"}}>food</span></h1>
          <span className="delivery-eta">
            <span className="eta-dot" />
            <span className="eta-icon">🛵</span>
            Delivery in {deliveryInfo.etaMin}–{deliveryInfo.etaMax} min
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <button className="history-nav-link" onClick={() => setView(view === "history" ? "menu" : "history")}>
            {view === "history" ? "Back to menu" : "Order history"}
          </button>
          <div className="cart-badge-wrapper">
            <span className="cart-icon">🛒</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </div>
        </div>
      </header>

      {view === "history" ? (
        <OrderHistory />
      ) : (
        <main className="app-main">
          <Menu
            dishes={dishes}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onAddToCart={addToCart}
          />
          <Cart
            cart={cart}
            onRemove={removeFromCart}
            onCheckout={() => setShowPayment(true)}
            guests={guests}
            assignments={assignments}
            onManageGuests={() => setShowGuestsModal(true)}
            onUpdateAssignment={updateAssignment}
          />
        </main>
      )}

      {showGuestsModal && (
        <GuestsModal
          guests={guests}
          onAddGuest={addGuest}
          onRemoveGuest={removeGuest}
          onClose={() => setShowGuestsModal(false)}
        />
      )}

      {showPayment && (
        <PaymentModal
          cart={cart}
          guests={guests}
          assignments={assignments}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setCart([]);
            setGuests([]);
            setAssignments({});
            setShowPayment(false);
          }}
        />
      )}
    </div>
  );
}
