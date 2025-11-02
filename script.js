/* ===========================
   script.js - Frontend logic
   ===========================
   - Maneja carga de RIFs, selección, envío de formularios (insert/update).
   - Espera respuestas JSON desde el Apps Script (backend).
   - Actualiza la UI con mensajes y manejo de errores.
*/

/* ------------------------
   CONFIG: Actualiza aquí
   ------------------------ */
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyojJuqpKiOkzH4MNQiutywAjfiNFTejWNVIjBh2j2bMItKgyHcxg4AiUYn2YC-nVuZRA/exec";
// ↑ Sustituye por la URL de despliegue de tu Google Apps Script (obtenida al "Implementar como aplicación web")

const TOKEN = "Ventas_equipo_1919";
// ↑ Cambia este token por uno seguro si lo deseas. Debe coincidir con el token validado en el Apps Script.

/* ------------------------
   Elementos DOM
   ------------------------ */
const modeSelect = document.getElementById("modeSelect");
const divRifSelect = document.getElementById("divRifSelect");
const rifSelect = document.getElementById("rifSelect");
const divRifInput = document.getElementById("divRifInput");
const rifInput = document.getElementById("rif");
const mainForm = document.getElementById("mainForm");
const exitoBox = document.getElementById("exito");
const btnSubmit = document.getElementById("btnSubmit");

/* Lista de campos que leeremos/escribiremos en el formulario.
   Debe coincidir con los nombres/orden que usa tu hoja de cálculo */
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

/* ------------------------
   Eventos
   ------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  // Configura UI según modo inicial
  handleModeChange(modeSelect.value);

  // Listeners
  modeSelect.addEventListener("change", (e) =>
    handleModeChange(e.target.value)
  );
  rifSelect.addEventListener("change", onRIFSelectChange);
  mainForm.addEventListener("submit", onFormSubmit);
});

/* ------------------------
   Funciones
   ------------------------ */

/**
 * Cambia la interfaz según el modo (nuevo/actualizar).
 * En modo 'actualizar' muestra el select de RIFs y carga la lista.
 */
function handleModeChange(mode) {
  exitoBox.style.display = "none";
  mainForm.reset();

  if (mode === "nuevo") {
    divRifSelect.style.display = "none";
    divRifInput.style.display = "block";
    rifInput.disabled = false;
    // No es necesario recargar RIFs en modo nuevo
  } else {
    divRifSelect.style.display = "block";
    divRifInput.style.display = "none";
    rifInput.disabled = true;
    // Cargar la lista actualizada de RIFs desde el backend
    loadRIFs();
  }
}

/**
 * Carga la lista de RIFs desde el Apps Script.
 * Espera respuesta JSON con la estructura: { ok: true, rifs: ["J-...","J-..."] }
 */
async function loadRIFs() {
  rifSelect.innerHTML = '<option value="">Cargando RIFs...</option>';

  try {
    const res = await fetch(
      `${WEB_APP_URL}?action=getRIFs&token=${encodeURIComponent(TOKEN)}`,
      {
        method: "GET",
        // No CORS mode tweaks aquí: backend debe permitirlo con headers.
      }
    );

    // Si el servidor devuelve error HTTP, lanzar excepción
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json(); // esperamos JSON válido

    if (json.ok && Array.isArray(json.rifs)) {
      rifSelect.innerHTML = '<option value="">Seleccione un RIF</option>';
      json.rifs.forEach((rif) => {
        const option = document.createElement("option");
        option.value = rif;
        option.textContent = rif;
        rifSelect.appendChild(option);
      });
    } else {
      console.error("Respuesta inválida de getRIFs:", json);
      rifSelect.innerHTML = '<option value="">No hay RIFs disponibles</option>';
    }
  } catch (err) {
    console.error("Error al cargar RIFs:", err);
    rifSelect.innerHTML = '<option value="">Error al cargar RIFs</option>';
  }
}

/**
 * Cuando el usuario selecciona un RIF, obtenemos la fila correspondiente.
 * Esperamos JSON: { ok: true, row: { rif: "...", fecha: "...", ... } }
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
      {
        method: "GET",
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    if (json.ok && json.row) {
      // Poner valores en los inputs según formFields
      formFields.forEach((field) => {
        const input = document.getElementById(field);
        if (input) {
          // Si la propiedad no existe, dejar cadena vacía
          input.value = json.row[field] !== undefined ? json.row[field] : "";
        }
      });
    } else {
      console.error("Error al obtener fila:", json);
      alert("Error al cargar los datos: " + (json.error || "Desconocido"));
    }
  } catch (err) {
    console.error("Error onRIFSelectChange:", err);
    alert("Error de conexión al cargar los datos: " + err.message);
  }
}

/**
 * Envío del formulario. Dependiendo del modo, hará 'insertRow' o 'updateRow'.
 * Envia JSON como body en POST y espera respuesta JSON.
 */
async function onFormSubmit(e) {
  e.preventDefault();

  // Validaciones mínimas:
  if (modeSelect.value === "nuevo") {
    const rifValue = rifInput.value.trim();
    if (!rifValue) {
      alert("Por favor, ingrese un RIF");
      return;
    }
  }
  if (modeSelect.value === "actualizar" && !rifSelect.value) {
    alert("Por favor, seleccione un RIF existente");
    return;
  }

  // Construir payload con token y campos
  const payload = { token: TOKEN };
  formFields.forEach((k) => {
    payload[k] = document.getElementById(k)?.value || "";
  });

  payload.action =
    modeSelect.value === "actualizar" ? "updateRow" : "insertRow";
  if (payload.action === "updateRow") payload.selectedRIF = rifSelect.value;

  try {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Enviando...";

    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    if (json.ok) {
      exitoBox.style.display = "flex";
      setTimeout(() => {
        exitoBox.style.display = "none";
        if (modeSelect.value === "nuevo") {
          mainForm.reset();
        }
      }, 3000);
      // refrescar lista (si está en modo actualizar)
      if (modeSelect.value === "actualizar") loadRIFs();
      if (modeSelect.value === "nuevo") loadRIFs(); // si insertaste, actualizar lista
    } else {
      alert("Error: " + (json.error || "Desconocido"));
    }
  } catch (err) {
    console.error("Error en onFormSubmit:", err);
    alert("Error de red al enviar el formulario: " + err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Guardar";
  }
}
