const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbza01j0Po8wyVeCPtZK667FHp7-nhSQnWHwSlEQqvloIFjgyMCrSO23pblc3JUNEb1VLQ/exec";
const TOKEN = "Ventas_equipo_1919";

const modeSelect = document.getElementById("modeSelect");
const divRifSelect = document.getElementById("divRifSelect");
const rifSelect = document.getElementById("rifSelect");
const divRifInput = document.getElementById("divRifInput");
const rifInput = document.getElementById("rif");
const mainForm = document.getElementById("mainForm");
const exitoBox = document.getElementById("exito");
const btnSubmit = document.getElementById("btnSubmit");

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

// Función para hacer una solicitud preflight CORS
async function checkCORS() {
  try {
    await fetch(WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "preflight", token: TOKEN }),
    });
    return true;
  } catch (e) {
    console.warn("CORS preflight check failed:", e);
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Verificar CORS primero
  const corsWorks = await checkCORS();
  if (!corsWorks) {
    console.warn("CORS podría estar causando problemas");
  }

  handleModeChange(modeSelect.value);
  loadRIFs();
  modeSelect.addEventListener("change", (e) =>
    handleModeChange(e.target.value)
  );
  rifSelect.addEventListener("change", onRIFSelectChange);
  mainForm.addEventListener("submit", onFormSubmit);
});

function handleModeChange(mode) {
  if (mode === "nuevo") {
    divRifSelect.style.display = "none";
    divRifInput.style.display = "block";
    rifInput.disabled = false;
    mainForm.reset();
    exitoBox.style.display = "none";
  } else {
    divRifSelect.style.display = "block";
    divRifInput.style.display = "none";
    rifInput.disabled = true;
    mainForm.reset();
    exitoBox.style.display = "none";
    loadRIFs();
  }
}

async function loadRIFs() {
  rifSelect.innerHTML = '<option value="">Cargando RIFs...</option>';
  try {
    // Usar fetch con modo 'no-cors' como fallback
    let res;
    try {
      res = await fetch(`${WEB_APP_URL}?action=getRIFs&token=${TOKEN}`);
    } catch (e) {
      console.warn("Fetch directo falló, intentando con modo no-cors", e);
      res = await fetch(`${WEB_APP_URL}?action=getRIFs&token=${TOKEN}`, {
        mode: "no-cors",
      });
      // Si usamos no-cors, no podemos leer la respuesta pero al menos sabemos que llegó
      rifSelect.innerHTML =
        '<option value="">Error: Revisa la consola</option>';
      return;
    }

    // Verificar si la respuesta es válida
    if (!res || !res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const text = await res.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("Error parsing JSON:", e, "Response text:", text);
      throw new Error("Respuesta inválida del servidor");
    }

    if (json.ok && Array.isArray(json.rifs)) {
      rifSelect.innerHTML = '<option value="">Seleccione un RIF</option>';
      json.rifs.forEach((rif) => {
        const opt = document.createElement("option");
        opt.value = rif;
        opt.textContent = rif;
        rifSelect.appendChild(opt);
      });
    } else {
      rifSelect.innerHTML = '<option value="">No hay RIFs disponibles</option>';
      console.error("Error en la respuesta:", json);
    }
  } catch (err) {
    console.error("Error al cargar RIFs:", err);
    rifSelect.innerHTML = '<option value="">Error al cargar RIFs</option>';
  }
}

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
      )}&token=${TOKEN}`
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const text = await res.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("Error parsing JSON:", e, "Response text:", text);
      throw new Error("Respuesta inválida del servidor");
    }

    if (json.ok && json.row) {
      formFields.forEach((field) => {
        const input = document.getElementById(field);
        if (input && json.row[field] !== undefined) {
          input.value = json.row[field] || "";
        }
      });
    } else {
      console.error("Error al cargar datos del RIF:", json.error);
      alert("Error al cargar los datos: " + (json.error || "Desconocido"));
    }
  } catch (err) {
    console.error("Error en onRIFSelectChange:", err);
    alert("Error de conexión al cargar los datos: " + err.message);
  }
}

async function onFormSubmit(e) {
  e.preventDefault();

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

  const payload = { token: TOKEN };
  formFields.forEach((k) => {
    payload[k] = document.getElementById(k)?.value || "";
  });

  // Añadir acción según el modo
  if (modeSelect.value === "actualizar") {
    payload.action = "updateRow";
    payload.selectedRIF = rifSelect.value;
  } else {
    payload.action = "insertRow";
  }

  try {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Enviando...";

    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const text = await res.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("Error parsing JSON:", e, "Response text:", text);
      throw new Error("Respuesta inválida del servidor");
    }

    if (json.ok) {
      exitoBox.style.display = "flex";
      setTimeout(() => {
        exitoBox.style.display = "none";
        if (modeSelect.value === "nuevo") {
          mainForm.reset();
        }
      }, 3000);

      loadRIFs();
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
