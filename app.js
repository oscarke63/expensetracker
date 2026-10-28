// ---------- Storage ----------
const STORAGE_KEY = "expenses";

function loadExpenses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

let expenses = loadExpenses();

// ---------- Page elements ----------
const form = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const noteInput = document.getElementById("note");
const dateInput = document.getElementById("date");
const amountError = document.getElementById("amount-error");
const dateError = document.getElementById("date-error");
const formMessage = document.getElementById("form-message");
const countEl = document.getElementById("count");

// ---------- Helpers ----------
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

function render() {
  countEl.textContent = expenses.length;
}

// ---------- Add an expense ----------
form.addEventListener("submit", function (event) {
  event.preventDefault();
  amountError.textContent = "";
  dateError.textContent = "";
  formMessage.textContent = "";

  const amount = parseFloat(amountInput.value);
  let valid = true;

  if (amountInput.value.trim() === "" || isNaN(amount)) {
    amountError.textContent = "Please enter an amount.";
    valid = false;
  } else if (amount <= 0) {
    amountError.textContent = "Amount must be greater than 0.";
    valid = false;
  }

  if (!dateInput.value) {
    dateError.textContent = "Please pick a date.";
    valid = false;
  }

  if (!valid) return;

  expenses.push({
    id: Date.now(),
    amount: amount,
    category: categoryInput.value,
    note: noteInput.value.trim(),
    date: dateInput.value,
  });
  saveExpenses(expenses);

  amountInput.value = "";
  noteInput.value = "";
  formMessage.textContent = "Expense added!";
  amountInput.focus();
  render();
});

// ---------- Start up ----------
dateInput.value = todayString();
render();
