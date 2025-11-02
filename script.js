/* ===========================================
   script.js - Lógica principal del frontend
   ===========================================
   - Usa la URL del WebApp (GAS) para consultar/insertar/actualizar.
   - Los ids de inputs están normalizados (sin tildes/minúsculas) y el backend
     devuelve objetos con las mismas claves normalizadas.
*/

/* --------------------------
   CONFIGURACIÓN (edítala si es necesario)
   -------------------------- */

// 🔁 -> REEMPLAZA ESTA URL con la URL /exec de tu Apps Script desplegado.
// Asegúrate de que el deployment tenga acceso "Cualquiera, incluso anónimo".
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyHLlAl8oUTFygRpvkVHxKb6vFCJwmOHTNs0qvBh_8_u-DRUpK2YyXQrqJ9RtNz7LxjHA/exec";

// 🔑 Token básico de seguridad. Debe coincidir con TOKEN_BACKEND en Code.gs.
// Si lo cambias en backend, cámbialo aquí también.
const TOKEN = "Ventas_equipo_1919";

/* --------------------------
   DOM
   -------------------------- */
const modeSelect = document.getElementById("modeSelect");
const divRifSelect = document.getElementById("divRifSelect");
const rifSelect = document.getElementById("rifSelect");
const divRifInput = document.getElementById("divRifInput");
const rifInput = document.getElementById("rif");
const mainForm = document.getElementById("mainForm");
const exitoBox = document.getElementById("exito");
const btnSubmit = document.getElementById("btnSubmit");

/* Lista de campos que usamos en el formulario. Corresponden a claves normalizadas. */
const formFields = [
  "rif",
  "fecha",
  "region",
  "ejecutiva",
  "razonsocial",
  "servicio",
  "propuesta",
  "srm",
  "beneficios",
  "observaciones",
  "estatus",
  "fechacap",
  "codigocliente",
  "rangokg",
  "codigof",
];

document.addEventListener("DOMContentLoaded", () => {
  handleModeChange(modeSelect.value);
  modeSelect.addEventListener("change", (e) =>
    handleModeChange(e.target.value)
  );
  rifSelect.addEventListener("change", onRIFSelectChange);
  mainForm.addEventListener("submit", onFormSubmit);
});

/* ---------- UI / lógica ---------- */

function handleModeChange(mode) {
  exitoBox.style.display = "none";
  mainForm.reset();

  if (mode === "nuevo") {
    divRifSelect.style.display = "none";
    divRifInput.style.display = "block";
    rifInput.disabled = false;
  } else {
    divRifSelect.style.display = "block";
    divRifInput.style.display = "none";
    rifInput.disabled = true;
    loadRIFs();
  }
}

/**
 * loadRIFs: solicita al backend la lista de RIFs (campo en la hoja).
 * backend devuelve { ok: true, rifs: [...] }
 */
async function loadRIFs() {
  rifSelect.innerHTML = '<option value="">Cargando RIFs...</option>';
  try {
    const res = await fetch(
      `${WEB_APP_URL}?action=getRIFs&token=${encodeURIComponent(TOKEN)}`,
      { method: "GET" }
    );

    // Si hizo preflight y devolvió error 4xx/5xx, el fetch lanzará excepción o res.ok será false.
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.ok && Array.isArray(json.rifs)) {
      rifSelect.innerHTML = '<option value="">Seleccione un RIF</option>';
      json.rifs.forEach((rif) => {
        const opt = document.createElement("option");
        opt.value = rif;
        opt.textContent = rif;
        rifSelect.appendChild(opt);
      });
    } else {
      rifSelect.innerHTML = '<option value="">No hay RIFs</option>';
      console.warn("getRIFs respuesta inválida:", json);
    }
  } catch (err) {
    console.error("Error al cargar RIFs:", err);
    rifSelect.innerHTML = '<option value="">Error al cargar RIFs</option>';
  }
}

/**
 * onRIFSelectChange: obtiene la fila completa del RIF seleccionado.
 * backend devuelve: { ok: true, row: {fecha: '...', rif: '...', razonsocial: '...', ... } }
 */
async function onRIFSelectChange(e) {
  const rifValue = e.target.value;
  if (!rifValue) {
    mainForm.reset();
    return;
  }

  try {
    const res = await fetch(
      `${WEB_APP_URL}?action=getRowByRIF&rif=${encodeURIComponent(
        rifValue
      )}&token=${encodeURIComponent(TOKEN)}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.ok && json.row) {
      // Llena inputs según claves normalizadas
      formFields.forEach((field) => {
        const input = document.getElementById(field);
        if (input)
          input.value = json.row[field] !== undefined ? json.row[field] : "";
      });
    } else {
      alert("Error al cargar datos: " + (json.error || "Desconocido"));
      console.error("getRowByRIF:", json);
    }
  } catch (err) {
    console.error("Error onRIFSelectChange:", err);
    alert("Error de conexión al cargar los datos: " + err.message);
  }
}

/**
 * onFormSubmit: arma payload con campos y llama al backend (insertRow/updateRow)
 */
async function onFormSubmit(e) {
  e.preventDefault();

  if (modeSelect.value === "nuevo" && !rifInput.value.trim()) {
    alert("Por favor ingresa un RIF válido.");
    return;
  }
  if (modeSelect.value === "actualizar" && !rifSelect.value) {
    alert("Selecciona un RIF existente.");
    return;
  }

  const payload = { token: TOKEN };
  formFields.forEach(
    (k) => (payload[k] = document.getElementById(k)?.value || "")
  );

  payload.action =
    modeSelect.value === "actualizar" ? "updateRow" : "insertRow";
  if (payload.action === "updateRow") payload.selectedRIF = rifSelect.value;

  try {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Enviando...";

    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.ok) {
      exitoBox.style.display = "flex";
      setTimeout(() => (exitoBox.style.display = "none"), 3000);
      mainForm.reset();
      loadRIFs();
    } else {
      alert("Error: " + (json.error || "Desconocido"));
      console.error("onFormSubmit backend:", json);
    }
  } catch (err) {
    console.error("Error en onFormSubmit:", err);
    alert("Error de red al enviar el formulario: " + err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Guardar";
  }
}
