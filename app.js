const form = document.querySelector("#fuelForm");
const customerName = document.querySelector("#customerName");
const assetNumber = document.querySelector("#assetNumber");
const liters = document.querySelector("#liters");
const hourMeter = document.querySelector("#hourMeter");
const hourMeterField = document.querySelector("#hourMeterField");
const photosInput = document.querySelector("#photos");
const photoList = document.querySelector("#photoList");
const toast = document.querySelector("#toast");
const installButton = document.querySelector("#installButton");
const pwaStatus = document.querySelector("#pwaStatus");

const scannerDialog = document.querySelector("#scannerDialog");
const scannerVideo = document.querySelector("#scannerVideo");
const scannerMessage = document.querySelector("#scannerMessage");
const scanButton = document.querySelector("#scanButton");
const closeScanner = document.querySelector("#closeScanner");
const manualScanValue = document.querySelector("#manualScanValue");
const useManualValue = document.querySelector("#useManualValue");

let selectedPhotos = [];
let deferredInstallPrompt = null;
let scannerStream = null;
let scannerTimer = null;

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
    [assetNumber, "Vul of scan het tank-/machinenummer."],
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

function getMailSubject(now = new Date()) {
  return `Aftankbeurt uitgevoerd - ${customerName.value.trim()} - ${dateFormatter.format(now)}`;
}

function getMailBody(includePhotoAttachmentNote = false) {
  const now = new Date();
  const hourMeterPresent = isHourMeterPresent();
  const hourMeterValue = hourMeterPresent ? formatDecimalForMail(hourMeter.value) : "Niet aanwezig";
  const notes = form.elements.notes.value.trim() || "Geen opmerkingen";
  const userName = form.elements.userName.value.trim() || "App gebruiker";
  const photoText = selectedPhotos.length
    ? `${selectedPhotos.length} foto('s) bijgevoegd${includePhotoAttachmentNote ? " via de deel-functie" : ""}.`
    : "Geen foto's toegevoegd";

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
    receiptLine("Datum", dateFormatter.format(now)),
    receiptLine("Tijd", timeFormatter.format(now)),
    receiptLine("Bon type", "Aftankbeurt"),
    "",
    "--------------------------------",
    receiptLine("Klant", customerName.value.trim()),
    receiptLine("Tank/machine nr.", assetNumber.value.trim()),
    receiptLine("Aantal liters", `${formatDecimalForMail(liters.value)} liter`),
    receiptLine("Urenstand aanwezig", hourMeterPresent ? "Ja" : "Nee"),
    receiptLine("Urenstand", hourMeterValue),
    "",
    "--------------------------------",
    "OPMERKINGEN",
    notes,
    "",
    "--------------------------------",
    "BIJLAGEN",
    photoText,
    "",
    "================================",
    "Controleer de gegevens voor verzenden.",
    "================================",
    "",
    "Met vriendelijke groet,",
    userName,
  ].join("\n");
}

function openMailtoDraft() {
  const subject = getMailSubject();
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(getMailBody(false))}`;

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

async function shareMailWithPhotos() {
  const subject = getMailSubject();
  const body = getMailBody(true);

  if (navigator.canShare && navigator.canShare({ files: selectedPhotos }) && navigator.share) {
    await navigator.share({
      title: subject,
      text: `${subject}\n\n${body}`,
      files: selectedPhotos,
    });
    showToast("Kies Mail om de tankbon met foto('s) te versturen.");
    return;
  }

  showToast("Foto's meesturen kan hier niet automatisch. Mail wordt zonder bijlage geopend.");
  openMailtoDraft();
}

async function openMailDraft() {
  if (selectedPhotos.length) {
    try {
      await shareMailWithPhotos();
    } catch (error) {
      if (error.name !== "AbortError") {
        showToast("Delen met foto's lukte niet. Mail wordt zonder bijlage geopend.");
        openMailtoDraft();
      }
    }
    return;
  }

  openMailtoDraft();
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

async function startScanner() {
  manualScanValue.value = "";
  scannerMessage.textContent = "Camera wordt gestart...";
  scannerDialog.showModal();

  if (!("BarcodeDetector" in window)) {
    scannerMessage.textContent = "Deze browser ondersteunt geen directe barcode-scan. Gebruik het handmatige veld.";
    return;
  }

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    scannerVideo.srcObject = scannerStream;
    await scannerVideo.play();

    const detector = new BarcodeDetector({
      formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
    });

    scannerMessage.textContent = "Richt de camera op de code.";
    scannerTimer = window.setInterval(async () => {
      try {
        const codes = await detector.detect(scannerVideo);
        if (codes.length > 0) {
          assetNumber.value = codes[0].rawValue;
          setError(assetNumber, "");
          showToast("Nummer gescand.");
          stopScanner();
        }
      } catch {
        scannerMessage.textContent = "Scannen lukt niet. Probeer meer licht of vul handmatig in.";
      }
    }, 650);
  } catch {
    scannerMessage.textContent = "Camera-toegang is geweigerd of niet beschikbaar. Vul het nummer handmatig in.";
  }
}

function stopScanner() {
  if (scannerTimer) window.clearInterval(scannerTimer);
  scannerTimer = null;
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
  }
  scannerStream = null;
  scannerVideo.srcObject = null;
  if (scannerDialog.open) scannerDialog.close();
}

function useManualScanValue() {
  const value = manualScanValue.value.trim();
  if (!value) {
    showToast("Vul eerst een nummer in.");
    return;
  }
  assetNumber.value = value;
  setError(assetNumber, "");
  stopScanner();
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
scanButton.addEventListener("click", startScanner);
closeScanner.addEventListener("click", stopScanner);
useManualValue.addEventListener("click", useManualScanValue);
scannerDialog.addEventListener("cancel", stopScanner);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("online", () => (pwaStatus.textContent = "Online"));
window.addEventListener("offline", () => (pwaStatus.textContent = "Offline klaar"));

updateHourMeterVisibility();
registerServiceWorker();
