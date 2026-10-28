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
const listEl = document.getElementById("expense-list");
const emptyEl = document.getElementById("empty");
const totalEl = document.getElementById("total");
const totalLabelEl = document.getElementById("total-label");
const filterCategory = document.getElementById("filter-category");
const filterMonth = document.getElementById("filter-month");
const clearFiltersBtn = document.getElementById("clear-filters");

// ---------- Helpers ----------
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

function formatKES(n) {
  return "KES " + n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function render() {
  listEl.innerHTML = "";

  // apply the filters (an empty filter means "show all")
  const filtered = expenses.filter(function (e) {
    const categoryOk = !filterCategory.value || e.category === filterCategory.value;
    const monthOk = !filterMonth.value || e.date.startsWith(filterMonth.value);
    return categoryOk && monthOk;
  });
  const isFiltering = Boolean(filterCategory.value || filterMonth.value);

  // newest date first
  const sorted = filtered.slice().sort(function (a, b) {
    return b.date.localeCompare(a.date) || b.id - a.id;
  });

  let total = 0;
  sorted.forEach(function (exp) {
    total += exp.amount;

    const li = document.createElement("li");
    li.className = "expense";

    const info = document.createElement("div");
    info.className = "expense-info";

    const top = document.createElement("div");
    top.className = "expense-top";
    top.textContent = exp.category;

    const meta = document.createElement("div");
    meta.className = "expense-meta";
    meta.textContent = exp.date + (exp.note ? " · " + exp.note : "");

    info.appendChild(top);
    info.appendChild(meta);

    const amount = document.createElement("div");
    amount.className = "expense-amount";
    amount.textContent = formatKES(exp.amount);

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.type = "button";
    del.textContent = "Delete";
    del.setAttribute("aria-label", "Delete " + exp.category + " expense");
    del.addEventListener("click", function () {
      deleteExpense(exp.id);
    });

    li.appendChild(info);
    li.appendChild(amount);
    li.appendChild(del);
    listEl.appendChild(li);
  });

  if (filtered.length === 0) {
    emptyEl.textContent = isFiltering
      ? "No expenses match these filters."
      : "No expenses yet. Add your first one above.";
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
  }
  totalLabelEl.textContent = isFiltering ? "Total (filtered)" : "Total";
  totalEl.textContent = formatKES(total);
}

function deleteExpense(id) {
  expenses = expenses.filter(function (e) {
    return e.id !== id;
  });
  saveExpenses(expenses);
  render();
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

// ---------- Filters ----------
filterCategory.addEventListener("change", render);
filterMonth.addEventListener("input", render);
clearFiltersBtn.addEventListener("click", function () {
  filterCategory.value = "";
  filterMonth.value = "";
  render();
});

// ---------- Start up ----------
dateInput.value = todayString();
render();
