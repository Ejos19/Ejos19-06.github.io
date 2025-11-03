// ====== Selección de elementos del DOM que vamos a usar ======
// Obtenemos el formulario
const form = document.getElementById("form");
// Botón de envío (submit)
const submitButton = document.getElementById("submit-button");
// Div para mostrar mensajes (éxito/error/estado)
const messageDiv = document.getElementById("message");
// Input de tipo file
const fileInput = document.getElementById("fileInput");
// Span donde mostramos el nombre del archivo seleccionado
const fileNameDisplay = document.getElementById("fileNameDisplay");

// -------------------------------------------------------------
// Actualizar el nombre mostrado cuando el usuario selecciona un archivo
// fileInput.addEventListener se ejecuta cada vez que cambia el input file.
fileInput.addEventListener("change", function () {
  // this.files es una FileList; si hay al menos un archivo, mostramos su nombre
  if (this.files && this.files.length > 0) {
    fileNameDisplay.textContent = this.files[0].name;
  } else {
    // Si no hay archivo seleccionado, volvemos al texto por defecto
    fileNameDisplay.textContent = "No file selected";
  }
});

// -------------------------------------------------------------
// Función auxiliar para convertir un File en objeto con base64 (para enviarlo al servidor)
// Devuelve una promesa que resuelve con { fileName, mimeType, data }
async function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader(); // FileReader lee el contenido del archivo en el cliente
    fr.onload = (e) => {
      // Cuando termine, e.target.result es una data URL: "data:<mime>;base64,<datos>"
      const data = e.target.result.split(","); // separa el header de los datos base64
      const obj = {
        fileName: file.name,
        // data[0] contiene algo como "data:application/pdf;base64"
        mimeType: data[0].match(/:(\w.+);/)[1], // extrae el mimeType con regex
        data: data[1], // la parte base64 pura
      };
      resolve(obj);
    };
    fr.onerror = reject; // si hay error de lectura, rechazamos la promesa
    fr.readAsDataURL(file); // iniciamos la lectura como data URL
  });
}

// -------------------------------------------------------------
// Manejador del evento submit del formulario
form.addEventListener("submit", async function (e) {
  e.preventDefault(); // evita el envío tradicional (recarga de página)

  // Mostrar mensaje de "submitting" y estado visual
  messageDiv.textContent = "Submitting...";
  messageDiv.style.display = "block";
  messageDiv.style.backgroundColor = "beige";
  messageDiv.style.color = "black";
  submitButton.disabled = true; // deshabilitamos el botón para evitar doble envío
  submitButton.classList.add("is-loading"); // clase Bulma para spinner

  try {
    // Recogemos los datos del formulario en un FormData
    const formData = new FormData(this);
    const formDataObj = {};

    // Convertimos FormData a un objeto plano { clave: valor }
    for (let [key, value] of formData.entries()) {
      formDataObj[key] = value;
    }

    // Si hay archivo seleccionado, lo convertimos a base64 y lo añadimos
    if (fileInput.files.length > 0) {
      const fileObj = await uploadFile(fileInput.files[0]);
      formDataObj.fileData = fileObj; // agregamos la propiedad fileData al objeto
    }

    // URL del Web App (Google Apps Script) al que se enviará el JSON
    const scriptURL =
      "https://script.google.com/macros/s/AKfycby7CpwbX2QdfHO0MtQNyySYb6KZMrFPjmFaM5PlZODP2DWhLzL7cxd6mtRRVfrxDcghWg/exec";

    // Enviamos la petición POST con body en JSON (aquí Content-Type text/plain fue usado
    // en el original para sortear algunas políticas, pero se podría usar application/json si el server lo acepta)
    const response = await fetch(scriptURL, {
      redirect: "follow",
      method: "POST",
      body: JSON.stringify(formDataObj),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    // Esperamos y parseamos la respuesta JSON
    const data = await response.json();

    // Si la respuesta indica éxito, mostramos mensaje y reseteamos el formulario
    if (data.status === "success") {
      messageDiv.textContent = data.message || "Data submitted successfully!";
      messageDiv.style.backgroundColor = "#48c78e"; // verde (éxito)
      messageDiv.style.color = "white";
      form.reset(); // reset de todos los campos
      fileNameDisplay.textContent = "No file selected"; // reset del nombre del archivo mostrado
    } else {
      // Si el servidor devolvió status distinto a success, lanzamos error para caer al catch
      throw new Error(data.message || "Submission failed");
    }
  } catch (error) {
    // Manejo global de errores: log y mostrar en UI
    console.error("Error:", error);
    messageDiv.textContent = "Error: " + error.message;
    messageDiv.style.backgroundColor = "#f14668"; // rojo (error)
    messageDiv.style.color = "white";
  } finally {
    // Siempre: reactivar el botón y quitar el spinner
    submitButton.disabled = false;
    submitButton.classList.remove("is-loading");

    // Ocultar el mensaje transitorio después de 4s
    setTimeout(() => {
      messageDiv.textContent = "";
      messageDiv.style.display = "none";
    }, 4000);
  }
});

// -------------------------------------------------------------
// Mejorar el comportamiento del botón "Cancel" que está en el form.
// Se añade un listener al botón con clase is-danger (tal como en el HTML original).
const cancelButton = form.querySelector("button.is-danger");
cancelButton.addEventListener("click", function () {
  form.reset(); // limpiar todos los campos
  fileNameDisplay.textContent = "No file selected"; // limpiar nombre de archivo
  messageDiv.style.display = "none"; // ocultar mensajes
});
