export const TAX_RATE = 0.1;

export const HOST = { id: "host", name: "You (host)" };

export function formatCurrency(value) {
  return `€${value.toFixed(2)}`;
}

export function computeOrderTotals(cart) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export function buildDisplayNames(people) {
  const seenCount = {};
  for (const p of people) {
    seenCount[p.name] = (seenCount[p.name] || 0) + 1;
  }
  const runningIndex = {};
  return people.map((p) => {
    runningIndex[p.name] = (runningIndex[p.name] || 0) + 1;
    const isDup = seenCount[p.name] > 1;
    return { ...p, displayName: isDup ? `${p.name} (${runningIndex[p.name]})` : p.name };
  });
}

export function buildPersonItemBreakdown(cart, assignments, people) {
  const itemsByPerson = {};
  for (const p of people) itemsByPerson[p.id] = [];

  function addLine(personId, name, amount, percent) {
    if (!itemsByPerson[personId]) return;
    itemsByPerson[personId].push({ name, amount, percent });
  }

  for (const item of cart) {
    const lineTotal = item.price * item.quantity;
    const a = assignments[item.id] ?? { mode: "single", personId: HOST.id };

    if (a.mode === "single") {
      addLine(a.personId, item.name, lineTotal, 100);
    } else if (a.mode === "shared" && a.peopleIds.length > 0) {
      const percent = 100 / a.peopleIds.length;
      const share = lineTotal / a.peopleIds.length;
      for (const pid of a.peopleIds) addLine(pid, item.name, share, percent);
    } else if (a.mode === "units") {
      let assignedUnits = 0;
      for (const pid in a.units) {
        const units = a.units[pid] || 0;
        if (units <= 0) continue;
        assignedUnits += units;
        addLine(pid, item.name, item.price * units, (units / item.quantity) * 100);
      }
      const remainingUnits = item.quantity - assignedUnits;
      if (remainingUnits > 0) {
        addLine(HOST.id, item.name, item.price * remainingUnits, (remainingUnits / item.quantity) * 100);
      }
    } else {
      addLine(HOST.id, item.name, lineTotal, 100);
    }
  }

  return itemsByPerson;
}

export function computeSplit(cart, assignments, people) {
  const { subtotal: orderSubtotal, tax: orderTax, total: orderTotal } = computeOrderTotals(cart);

  const rawSubtotalByPerson = {};
  for (const p of people) rawSubtotalByPerson[p.id] = 0;

  for (const item of cart) {
    const lineTotal = item.price * item.quantity;
    const a = assignments[item.id] ?? { mode: "single", personId: HOST.id };

    if (a.mode === "single") {
      rawSubtotalByPerson[a.personId] = (rawSubtotalByPerson[a.personId] || 0) + lineTotal;
    } else if (a.mode === "shared" && a.peopleIds.length > 0) {
      const share = lineTotal / a.peopleIds.length;
      for (const pid of a.peopleIds) {
        rawSubtotalByPerson[pid] = (rawSubtotalByPerson[pid] || 0) + share;
      }
    } else if (a.mode === "units") {
      let assignedUnits = 0;
      for (const pid in a.units) {
        const units = a.units[pid] || 0;
        assignedUnits += units;
        rawSubtotalByPerson[pid] = (rawSubtotalByPerson[pid] || 0) + item.price * units;
      }
      const remainingUnits = item.quantity - assignedUnits;
      if (remainingUnits > 0) {
        rawSubtotalByPerson[HOST.id] = (rawSubtotalByPerson[HOST.id] || 0) + item.price * remainingUnits;
      }
    } else {
      rawSubtotalByPerson[HOST.id] = (rawSubtotalByPerson[HOST.id] || 0) + lineTotal;
    }
  }

  const rows = people.map((p) => {
    const sub = rawSubtotalByPerson[p.id] || 0;
    const taxShare = orderSubtotal > 0 ? orderTax * (sub / orderSubtotal) : 0;
    return { personId: p.id, subtotal: sub, tax: taxShare, total: sub + taxShare };
  });

  let roundedSumCents = 0;
  const roundedRows = rows.map((r) => {
    const roundedTotalCents = Math.round(r.total * 100);
    roundedSumCents += roundedTotalCents;
    return { ...r, roundedTotal: roundedTotalCents / 100 };
  });

  const realTotalCents = Math.round(orderTotal * 100);
  const remainderCents = realTotalCents - roundedSumCents;
  const hostRow = roundedRows.find((r) => r.personId === HOST.id);
  if (hostRow && remainderCents !== 0) {
    hostRow.roundedTotal = Math.round(hostRow.roundedTotal * 100 + remainderCents) / 100;
  }

  return { orderSubtotal, orderTax, orderTotal, rows: roundedRows };
}
