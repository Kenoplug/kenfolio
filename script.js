import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let portfolio = {};
let transactions = [];
let userId = null;

/* AUTH STATE */
onAuthStateChanged(auth, async user => {
  if (user) {
    userId = user.uid;
    await loadData();
    showApp();
    renderAll();
  } else {
    showAuth();
  }
});

/* AUTH ACTIONS */
loginBtn.onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value);

registerBtn.onclick = () =>
  createUserWithEmailAndPassword(auth, email.value, password.value);

logoutBtn.onclick = () => signOut(auth);

/* DATA */
async function saveData() {
  await setDoc(doc(db, "users", userId), { portfolio, transactions });
}

async function loadData() {
  const snap = await getDoc(doc(db, "users", userId));
  if (snap.exists()) {
    portfolio = snap.data().portfolio || {};
    transactions = snap.data().transactions || [];
  }
}

/* RESET */
resetBtn.onclick = async () => {
  if (!confirm("Delete everything?")) return;
  portfolio = {};
  transactions = [];
  await saveData();
  renderAll();
};

/* TRANSACTIONS */
txForm.onsubmit = async e => {
  e.preventDefault();

  const coin = coin.value.toLowerCase();
  const qty = Number(quantity.value);
  const price = Number(priceInput.value);
  const type = typeInput.value;

  if (!portfolio[coin]) portfolio[coin] = { qty: 0, cost: 0 };

  if (type === "buy") {
    portfolio[coin].qty += qty;
    portfolio[coin].cost += qty * price;
  } else {
    portfolio[coin].qty -= qty;
    portfolio[coin].cost -= qty * price;
  }

  transactions.unshift({
    date: new Date().toLocaleString(),
    coin, type, qty, price
  });

  await saveData();
  renderAll();
  txForm.reset();
};

function renderAll() {
  renderPortfolio();
  renderTransactions();
}

async function renderPortfolio() {
  portfolioTable.innerHTML = "";
  let invested = 0, current = 0;

  for (const coin in portfolio) {
    if (portfolio[coin].qty <= 0) continue;

    const price = await getPrice(coin);
    const qty = portfolio[coin].qty;
    const avg = portfolio[coin].cost / qty;

    invested += avg * qty;
    current += price * qty;

    portfolioTable.innerHTML += `
      <tr>
        <td>${coin.toUpperCase()}</td>
        <td>${qty}</td>
        <td>$${avg.toFixed(2)}</td>
        <td>$${price.toFixed(2)}</td>
        <td class="${current - invested >= 0 ? "profit" : "loss"}">
          ${(price * qty - avg * qty).toFixed(2)}
        </td>
      </tr>
    `;
  }

  investedEl.textContent = `$${invested.toFixed(2)}`;
  currentEl.textContent = `$${current.toFixed(2)}`;
  totalPnl.textContent = `$${(current - invested).toFixed(2)}`;
}

function renderTransactions() {
  transactionTable.innerHTML = "";
  transactions.forEach((t, i) => {
    transactionTable.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.coin}</td>
        <td>${t.type}</td>
        <td>${t.qty}</td>
        <td>$${t.price}</td>
        <td>
          <button onclick="editTx(${i})">Edit</button>
          <button onclick="delTx(${i})">Delete</button>
        </td>
      </tr>
    `;
  });
}

window.delTx = async i => {
  transactions.splice(i, 1);
  await saveData();
  renderTransactions();
};

window.editTx = async i => {
  const q = prompt("New quantity", transactions[i].qty);
  const p = prompt("New price", transactions[i].price);
  transactions[i].qty = Number(q);
  transactions[i].price = Number(p);
  await saveData();
  renderTransactions();
};

async function getPrice(coin) {
  const r = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`
  );
  const d = await r.json();
  return d[coin] ? d[coin].usd : 0;
}

/* UI */
function showApp() {
  authBox.style.display = "none";
  app.style.display = "block";
}
function showAuth() {
  authBox.style.display = "block";
  app.style.display = "none";
}
