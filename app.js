const form = document.querySelector("#fuelForm");
const customerName = document.querySelector("#customerName");
const assetNumber = document.querySelector("#assetNumber");
const liters = document.querySelector("#liters");
const hourMeter = document.querySelector("#hourMeter");
const hourMeterField = document.querySelector("#hourMeterField");
const photosInput = document.querySelector("#photos");
const photoList = document.querySelector("#photoList");
const toast = document.querySelector("#toast");
const pwaStatus = document.querySelector("#pwaStatus");

const receiptStorageKey = "equipAftankReceiptNumber";
let selectedPhotos = [];

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 3600);
}

function normalizeDecimal(value) {
  return value.trim().replace(",", ".");
}

function formatDecimalForMail(value) {
  return value.trim().replace(".", ",");
}

function receiptLine(label, value) {
  return `${label.padEnd(22, " ")} ${value}`;
}

function getNextReceiptNumber() {
  try {
    const current = Number(localStorage.getItem(receiptStorageKey) || "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    localStorage.setItem(receiptStorageKey, String(next));
    return String(next).padStart(6, "0");
  } catch {
    return String(Date.now()).slice(-6);
  }
}

function getReceiptData(receiptNumber, now = new Date()) {
  const hourMeterPresent = isHourMeterPresent();

  return {
    receiptNumber,
    date: dateFormatter.format(now),
    time: timeFormatter.format(now),
    customer: customerName.value.trim(),
    asset: assetNumber.value.trim(),
    liters: `${formatDecimalForMail(liters.value)} liter`,
    hourMeterPresent: hourMeterPresent ? "Ja" : "Nee",
    hourMeter: hourMeterPresent ? formatDecimalForMail(hourMeter.value) : "Niet aanwezig",
    notes: form.elements.notes.value.trim() || "Geen opmerkingen",
    userName: form.elements.userName.value.trim() || "App gebruiker",
  };
}

function setError(input, message) {
  const field = input.closest(".field");
  const error = document.querySelector(`[data-error-for="${input.id}"]`);
  if (field) field.classList.toggle("invalid", Boolean(message));
  if (error) error.textContent = message || "";
}

function isHourMeterPresent() {
  return form.elements.hourMeterPresent.value === "Ja";
}

function updateHourMeterVisibility() {
  const present = isHourMeterPresent();
  hourMeterField.hidden = !present;
  hourMeter.required = present;
  if (!present) {
    hourMeter.value = "";
    setError(hourMeter, "");
  }
}

function validateForm() {
  let valid = true;
  let firstInvalidInput = null;

  const requiredFields = [
    [customerName, "Vul de klantnaam in."],
    [assetNumber, "Vul het tank-/machinenummer in."],
    [liters, "Vul het aantal liters in."],
  ];

  requiredFields.forEach(([input, message]) => {
    const missing = input.value.trim().length === 0;
    setError(input, missing ? message : "");
    if (missing && !firstInvalidInput) firstInvalidInput = input;
    valid = valid && !missing;
  });

  const litersValue = Number(normalizeDecimal(liters.value));
  if (liters.value.trim() && (!Number.isFinite(litersValue) || litersValue <= 0)) {
    setError(liters, "Gebruik een geldig aantal liters groter dan 0.");
    if (!firstInvalidInput) firstInvalidInput = liters;
    valid = false;
  }

  if (isHourMeterPresent()) {
    const missing = hourMeter.value.trim().length === 0;
    const hourValue = Number(normalizeDecimal(hourMeter.value));
    const invalidNumber = hourMeter.value.trim() && (!Number.isFinite(hourValue) || hourValue < 0);
    setError(hourMeter, missing ? "Vul de urenstand in." : invalidNumber ? "Gebruik een geldige urenstand." : "");
    if ((missing || invalidNumber) && !firstInvalidInput) firstInvalidInput = hourMeter;
    valid = valid && !missing && !invalidNumber;
  }

  if (firstInvalidInput) {
    firstInvalidInput.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalidInput.focus({ preventScroll: true });
  }

  return valid;
}

function getMailSubject(receiptNumber, now = new Date()) {
  return `Aftankbeurt uitgevoerd - ${customerName.value.trim()} - ${dateFormatter.format(now)} - Bon ${receiptNumber}`;
}

function getMailBody(receiptNumber, now = new Date()) {
  const receipt = getReceiptData(receiptNumber, now);

  return [
    "Beste collega,",
    "",
    "Hierbij de tankbon van de uitgevoerde aftankbeurt.",
    "",
    "================================",
    "        EQUIP RENTAL",
    "       AFTANK BONNETJE",
    "================================",
    "",
    receiptLine("Bonnummer", receipt.receiptNumber),
    receiptLine("Datum", receipt.date),
    receiptLine("Tijd", receipt.time),
    receiptLine("Bon type", "Aftankbeurt"),
    "",
    "--------------------------------",
    receiptLine("Klant", receipt.customer),
    receiptLine("Tank/machine nr.", receipt.asset),
    receiptLine("Aantal liters", receipt.liters),
    receiptLine("Urenstand aanwezig", receipt.hourMeterPresent),
    receiptLine("Urenstand", receipt.hourMeter),
    "",
    "--------------------------------",
    "OPMERKINGEN",
    receipt.notes,
    "",
    "================================",
    "Met vriendelijke groet,",
    receipt.userName,
  ].join("\n");
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    context.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Bonnetje kon niet worden gemaakt."));
    }, "image/png");
  });
}

async function createReceiptFile(receiptNumber, now = new Date()) {
  const receipt = getReceiptData(receiptNumber, now);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 640;
  const lineHeight = 30;
  const margin = 44;
  const contentWidth = width - margin * 2;

  canvas.width = width;
  canvas.height = 980;

  context.fillStyle = "#f2f2ee";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(24, 24, width - 48, canvas.height - 48);

  context.fillStyle = "#101820";
  context.fillRect(24, 24, width - 48, 112);
  context.fillStyle = "#f4c430";
  context.fillRect(24, 132, width - 48, 10);

  context.textAlign = "center";
  context.fillStyle = "#f4c430";
  context.font = "700 34px Arial, sans-serif";
  context.fillText("EQUIP RENTAL", width / 2, 74);
  context.fillStyle = "#ffffff";
  context.font = "700 24px Arial, sans-serif";
  context.fillText("AFTANK BONNETJE", width / 2, 110);

  let y = 178;
  context.textAlign = "left";
  context.fillStyle = "#101820";
  context.font = "700 24px Courier New, monospace";
  context.fillText(`BONNR: ${receipt.receiptNumber}`, margin, y);
  y += 42;

  context.font = "20px Courier New, monospace";
  const rows = [
    ["Datum", receipt.date],
    ["Tijd", receipt.time],
    ["Bon type", "Aftankbeurt"],
    ["Klant", receipt.customer],
    ["Tank/machine nr.", receipt.asset],
    ["Aantal liters", receipt.liters],
    ["Urenstand aanwezig", receipt.hourMeterPresent],
    ["Urenstand", receipt.hourMeter],
  ];

  rows.forEach(([label, value], index) => {
    if (index === 3) {
      context.strokeStyle = "#d8ddd9";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(margin, y - 12);
      context.lineTo(width - margin, y - 12);
      context.stroke();
      y += 12;
    }

    context.fillStyle = "#4a535b";
    context.fillText(label, margin, y);
    context.fillStyle = "#101820";
    context.textAlign = "right";
    context.fillText(value, width - margin, y);
    context.textAlign = "left";
    y += 34;
  });

  context.strokeStyle = "#d8ddd9";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(margin, y);
  context.lineTo(width - margin, y);
  context.stroke();
  y += 42;

  context.fillStyle = "#101820";
  context.font = "700 21px Arial, sans-serif";
  context.fillText("OPMERKINGEN", margin, y);
  y += 32;
  context.font = "20px Arial, sans-serif";
  y = drawWrappedText(context, receipt.notes, margin, y, contentWidth, lineHeight);
  y += 28;

  context.strokeStyle = "#101820";
  context.setLineDash([8, 8]);
  context.beginPath();
  context.moveTo(margin, y);
  context.lineTo(width - margin, y);
  context.stroke();
  context.setLineDash([]);
  y += 42;

  context.font = "20px Courier New, monospace";
  context.fillStyle = "#101820";
  context.fillText("Met vriendelijke groet,", margin, y);
  y += 32;
  context.font = "700 22px Arial, sans-serif";
  context.fillText(receipt.userName, margin, y);
  y += 50;

  context.textAlign = "center";
  context.font = "18px Courier New, monospace";
  context.fillStyle = "#4a535b";
  context.fillText("********************************", width / 2, y);

  const finalHeight = Math.min(Math.max(y + 54, 760), canvas.height);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = finalHeight;
  outputCanvas.getContext("2d").drawImage(canvas, 0, 0);

  const blob = await canvasToBlob(outputCanvas);
  return new File([blob], `tankbon-${receipt.receiptNumber}.png`, { type: "image/png" });
}

function openMailtoDraft(receiptNumber, now = new Date()) {
  const subject = getMailSubject(receiptNumber, now);
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(getMailBody(receiptNumber, now))}`;

  if (mailto.length > 7800) {
    showToast("De mail is erg lang. Kort de opmerkingen in als de mail-app niet opent.");
  }

  const mailLink = document.createElement("a");
  mailLink.href = mailto;
  mailLink.style.display = "none";
  document.body.append(mailLink);
  mailLink.click();
  window.setTimeout(() => {
    window.location.href = mailto;
  }, 150);
  window.setTimeout(() => mailLink.remove(), 1000);
}

async function shareMailWithReceipt(receiptNumber, now = new Date()) {
  const subject = getMailSubject(receiptNumber, now);
  const body = getMailBody(receiptNumber, now);
  const receiptFile = await createReceiptFile(receiptNumber, now);
  const files = [receiptFile, ...selectedPhotos];

  if (navigator.canShare && navigator.canShare({ files }) && navigator.share) {
    await navigator.share({
      title: subject,
      text: `${subject}\n\n${body}`,
      files,
    });
    showToast("Kies Mail om de tankbon als bijlage te versturen.");
    return;
  }

  if (navigator.canShare && navigator.canShare({ files: [receiptFile] }) && navigator.share) {
    await navigator.share({
      title: subject,
      text: `${subject}\n\n${body}`,
      files: [receiptFile],
    });
    showToast("Kies Mail om de tankbon als bijlage te versturen.");
    return;
  }

  showToast("Bijlage delen lukt niet op dit toestel. Mail wordt zonder bonbestand geopend.");
  openMailtoDraft(receiptNumber, now);
}

async function openMailDraft() {
  const now = new Date();
  const receiptNumber = getNextReceiptNumber();

  try {
    await shareMailWithReceipt(receiptNumber, now);
  } catch (error) {
    if (error.name !== "AbortError") {
      showToast("Delen lukte niet. Mail wordt zonder bonbestand geopend.");
      openMailtoDraft(receiptNumber, now);
    }
  }
}

function renderPhotos() {
  photoList.innerHTML = "";
  selectedPhotos.forEach((file, index) => {
    const thumb = document.createElement("div");
    thumb.className = "photo-thumb";

    const img = document.createElement("img");
    img.alt = file.name || `Foto ${index + 1}`;
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", "Foto verwijderen");
    remove.textContent = "x";
    remove.addEventListener("click", () => {
      selectedPhotos.splice(index, 1);
      renderPhotos();
    });

    thumb.append(img, remove);
    photoList.append(thumb);
  });
}

function addPhotos(files) {
  const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
  selectedPhotos = [...selectedPhotos, ...images].slice(0, 12);
  renderPhotos();
  if (images.length) showToast(`${images.length} foto('s) toegevoegd.`);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("service-worker.js");
    pwaStatus.textContent = navigator.onLine ? "Online" : "Offline klaar";
  } catch {
    pwaStatus.textContent = "Browser opslag beperkt";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm()) {
    showToast("Controleer de rood gemarkeerde velden.");
    return;
  }
  await openMailDraft();
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    selectedPhotos = [];
    renderPhotos();
    updateHourMeterVisibility();
    document.querySelectorAll(".error-message").forEach((error) => (error.textContent = ""));
    document.querySelectorAll(".invalid").forEach((field) => field.classList.remove("invalid"));
  });
});

Array.from(form.elements.hourMeterPresent).forEach((radio) => {
  radio.addEventListener("change", updateHourMeterVisibility);
});

[customerName, assetNumber, liters, hourMeter].forEach((input) => {
  input.addEventListener("input", () => setError(input, ""));
});

photosInput.addEventListener("change", (event) => addPhotos(event.target.files));

window.addEventListener("online", () => (pwaStatus.textContent = "Online"));
window.addEventListener("offline", () => (pwaStatus.textContent = "Offline klaar"));

updateHourMeterVisibility();
registerServiceWorker();
