let selectedRow = null;

// Row click selection
document.querySelectorAll("#invoiceTable tbody tr").forEach(row => {
  row.addEventListener("click", () => {
    // Remove previous selection
    if (selectedRow) {
      selectedRow.classList.remove("selected");
    }
    // Set new selection
    selectedRow = row;
    row.classList.add("selected");
  });
});

// Export selected row as PDF
function downloadPDF() {
  if (!selectedRow) {
    alert("Please select an invoice row first.");
    return;
  }

  const invoiceData = {
    id: selectedRow.cells[0].innerText,
    date: selectedRow.cells[1].innerText,
    service: selectedRow.cells[2].innerText,
    amount: selectedRow.cells[3].innerText,
    status: selectedRow.cells[4].innerText
  };

  const doc = new jspdf.jsPDF();

  doc.setFontSize(18);
  doc.text("Invoice", 90, 20);

  doc.setFontSize(12);
  doc.text(`Invoice Number: ${invoiceData.id}`, 20, 40);
  doc.text(`Date: ${invoiceData.date}`, 20, 50);
  doc.text(`Service: ${invoiceData.service}`, 20, 60);
  doc.text(`Amount: ${invoiceData.amount}`, 20, 70);
  doc.text(`Status: ${invoiceData.status}`, 20, 80);

  doc.setFontSize(10);
  doc.text("Thank you for your business!", 20, 100);

  doc.save(`${invoiceData.id}.pdf`);
}

    // Dummy Data (for now could replace with DB/API)
const invoices = [
  { id: "INV001", date: "2025-08-01", service: "Web Hosting", amount: 50, status: "Paid" },
  { id: "INV002", date: "2025-08-10", service: "Domain Renewal", amount: 15, status: "Pending" },
  { id: "INV003", date: "2025-08-15", service: "SEO Services", amount: 200, status: "Overdue" }
];

// Filter + Search Logic
const searchEl = document.getElementById("searchInvoice");
if (searchEl) {
  searchEl.addEventListener("input", filterTable);
}

const statusEl = document.getElementById("statusFilter");
if (statusEl) {
  statusEl.addEventListener("change", filterTable);
}

function filterTable() {
  const searchVal = document.getElementById("searchInvoice").value.toLowerCase();
  const statusVal = document.getElementById("statusFilter").value;

  const rows = document.querySelectorAll("#invoiceTable tbody tr");
  rows.forEach(row => {
    const id = row.cells[0].innerText.toLowerCase();
    const status = row.cells[4].innerText;
    const matchSearch = id.includes(searchVal);
    const matchStatus = statusVal === "" || status === statusVal;
    row.style.display = matchSearch && matchStatus ? "" : "none";
  });
}

// Export PDF (using jsPDF)
function downloadPDF() {
  const doc = new jspdf.jsPDF();
  doc.text("Invoice List", 10, 10);
  doc.autoTable({ html: "#invoiceTable" });
  doc.save("invoices.pdf");
}

// Export CSV
function downloadCSV() {
  let csv = [];
  const rows = document.querySelectorAll("#invoiceTable tr");
  rows.forEach(row => {
    const cols = row.querySelectorAll("td, th");
    const data = [...cols].map(col => col.innerText).join(",");
    csv.push(data);
  });
  const csvBlob = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(csvBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "invoices.csv";
  a.click();
}

// Export selected row as PDF
function downloadSelectedPDF() {
  if (!selectedRow) {
    alert("Please select an invoice row first.");
    return;
  }

  const invoiceData = {
    id: selectedRow.cells[0].innerText,
    date: selectedRow.cells[1].innerText,
    service: selectedRow.cells[2].innerText,
    amount: selectedRow.cells[3].innerText,
    status: selectedRow.cells[4].innerText
  };

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Invoice", 90, 20);

  doc.setFontSize(12);
  doc.text(`Invoice Number: ${invoiceData.id}`, 20, 40);
  doc.text(`Date: ${invoiceData.date}`, 20, 50);
  doc.text(`Service: ${invoiceData.service}`, 20, 60);
  doc.text(`Amount: ${invoiceData.amount}`, 20, 70);
  doc.text(`Status: ${invoiceData.status}`, 20, 80);

  doc.setFontSize(10);
  doc.text("Thank you for your business!", 20, 100);

  doc.save(`${invoiceData.id}.pdf`);
}

// Export full table as PDF
function downloadAllPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Invoice List", 10, 10);
  doc.autoTable({ html: "#invoiceTable" });
  doc.save("invoices.pdf");
}