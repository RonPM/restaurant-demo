export const ORDER_HISTORY_KEY = "roofood_order_history";

export function getOrderHistory() {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrder(record) {
  try {
    const history = getOrderHistory();
    history.unshift(record);
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // localStorage unavailable (e.g. private browsing) — never block payment success on this.
  }
}
