// ---------- Settings ----------
const CATEGORIES = ["Food", "Transport", "Airtime", "Rent", "Other"];
const COLORS = {
  Food: "#2f80ed",
  Transport: "#27ae60",
  Airtime: "#f2994a",
  Rent: "#9b51e0",
  Other: "#828282",
};

// ---------- Storage ----------
const EXPENSES_KEY = "expenses";
const BUDGETS_KEY = "budgets";

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value || fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let expenses = loadJSON(EXPENSES_KEY, []);
let budgets = loadJSON(BUDGETS_KEY, {});

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

const exportBtn = document.getElementById("export-btn");
const exportMessage = document.getElementById("export-message");

const budgetForm = document.getElementById("budget-form");
const budgetError = document.getElementById("budget-error");
const budgetMessage = document.getElementById("budget-message");
const budgetMonthTitle = document.getElementById("budget-month-title");
const budgetStatus = document.getElementById("budget-status");

const chartEmpty = document.getElementById("chart-empty");
const chartWrap = document.getElementById("chart-wrap");
const chartCanvas = document.getElementById("pie-chart");
let chart = null;

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

function getFilteredExpenses() {
  return expenses.filter(function (e) {
    const categoryOk = !filterCategory.value || e.category === filterCategory.value;
    const monthOk = !filterMonth.value || e.date.startsWith(filterMonth.value);
    return categoryOk && monthOk;
  });
}

// ---------- Show the list and total ----------
function renderList(filtered) {
  listEl.innerHTML = "";
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

// ---------- Pie chart ----------
function renderChart(filtered) {
  const sums = {};
  filtered.forEach(function (e) {
    sums[e.category] = (sums[e.category] || 0) + e.amount;
  });
  const labels = CATEGORIES.filter(function (c) {
    return sums[c] > 0;
  });
  const data = labels.map(function (c) {
    return sums[c];
  });

  if (labels.length === 0) {
    chartEmpty.style.display = "block";
    chartWrap.style.display = "none";
    return;
  }
  chartEmpty.style.display = "none";
  chartWrap.style.display = "block";

  // Chart.js comes from a CDN; skip the chart if it could not load (offline)
  if (typeof Chart === "undefined") {
    chartEmpty.textContent = "Chart could not load. Check your internet connection.";
    chartEmpty.style.display = "block";
    chartWrap.style.display = "none";
    return;
  }

  const colors = labels.map(function (c) {
    return COLORS[c];
  });

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
  } else {
    chart = new Chart(chartCanvas, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [{ data: data, backgroundColor: colors }],
      },
      options: {
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.label + ": " + formatKES(ctx.parsed);
              },
            },
          },
        },
      },
    });
  }
}

// ---------- Budgets ----------
function budgetMonth() {
  // use the month filter if set, otherwise the current month
  if (/^\d{4}-\d{2}$/.test(filterMonth.value)) return filterMonth.value;
  return todayString().slice(0, 7);
}

function renderBudgets() {
  const month = budgetMonth();
  budgetMonthTitle.textContent = "Budget status for " + month;
  budgetStatus.innerHTML = "";

  let shown = 0;
  CATEGORIES.forEach(function (cat) {
    const limit = Number(budgets[cat]);
    if (!(limit > 0)) return;
    shown++;

    const spent = expenses
      .filter(function (e) {
        return e.category === cat && e.date.startsWith(month);
      })
      .reduce(function (sum, e) {
        return sum + e.amount;
      }, 0);
    const percent = (spent / limit) * 100;

    const item = document.createElement("div");
    item.className = "budget-item";

    const line = document.createElement("div");
    line.className = "budget-line";
    const name = document.createElement("strong");
    name.textContent = cat;
    const numbers = document.createElement("span");
    numbers.textContent = formatKES(spent) + " of " + formatKES(limit) + " (" + Math.round(percent) + "%)";
    line.appendChild(name);
    line.appendChild(numbers);

    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = Math.min(percent, 100) + "%";
    bar.appendChild(fill);

    item.appendChild(line);
    item.appendChild(bar);

    if (percent >= 100) {
      item.classList.add("over");
      const note = document.createElement("div");
      note.className = "budget-note";
      note.textContent = "Budget reached or exceeded (100%)!";
      item.appendChild(note);
    } else if (percent >= 80) {
      item.classList.add("warn");
      const note = document.createElement("div");
      note.className = "budget-note";
      note.textContent = "Warning: you have used 80% of this budget.";
      item.appendChild(note);
    }

    budgetStatus.appendChild(item);
  });

  if (shown === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No budgets set yet. Enter one above and click Save budgets.";
    budgetStatus.appendChild(p);
  }
}

function fillBudgetInputs() {
  CATEGORIES.forEach(function (cat) {
    document.getElementById("budget-" + cat).value = budgets[cat] > 0 ? budgets[cat] : "";
  });
}

budgetForm.addEventListener("submit", function (event) {
  event.preventDefault();
  budgetError.textContent = "";
  budgetMessage.textContent = "";

  const newBudgets = {};
  for (const cat of CATEGORIES) {
    const raw = document.getElementById("budget-" + cat).value.trim();
    if (raw === "") continue;
    const value = parseFloat(raw);
    if (isNaN(value) || value < 0) {
      budgetError.textContent = cat + " budget must be 0 or more.";
      return;
    }
    if (value > 0) newBudgets[cat] = value;
  }

  budgets = newBudgets;
  saveJSON(BUDGETS_KEY, budgets);
  budgetMessage.textContent = "Budgets saved!";
  renderBudgets();
});

// ---------- Export CSV ----------
function csvCell(value) {
  let text = String(value);
  // stop spreadsheets from running text that starts like a formula
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

exportBtn.addEventListener("click", function () {
  exportMessage.textContent = "";
  const rows = getFilteredExpenses().sort(function (a, b) {
    return a.date.localeCompare(b.date) || a.id - b.id;
  });

  if (rows.length === 0) {
    exportMessage.textContent = "Nothing to export. Add an expense first.";
    return;
  }

  const lines = [["Date", "Category", "Note", "Amount (KES)"].map(csvCell).join(",")];
  rows.forEach(function (e) {
    lines.push(
      [e.date, e.category, e.note, e.amount.toFixed(2)].map(csvCell).join(",")
    );
  });

  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "expenses-" + todayString() + ".csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

// ---------- Redraw everything ----------
function render() {
  const filtered = getFilteredExpenses();
  renderList(filtered);
  renderChart(filtered);
  renderBudgets();
}

// ---------- Add / delete ----------
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
  saveJSON(EXPENSES_KEY, expenses);

  amountInput.value = "";
  noteInput.value = "";
  formMessage.textContent = "Expense added!";
  amountInput.focus();
  render();
});

function deleteExpense(id) {
  expenses = expenses.filter(function (e) {
    return e.id !== id;
  });
  saveJSON(EXPENSES_KEY, expenses);
  render();
}

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
fillBudgetInputs();
render();
