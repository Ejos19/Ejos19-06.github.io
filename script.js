/**
 * 📜 script.js
 * Este archivo maneja el envío del formulario al Google Apps Script (Code.gs)
 * y muestra mensajes en pantalla según el resultado.
 */

// 🔗 URL del Web App publicado desde Google Apps Script
const scriptURL =
  "https://script.google.com/macros/s/AKfycbw05cYatwoxeQ8Acd8E1n5AwEpyLh_duqqq2r8VhGNbZQ6ZkNdpwlfZR54y2SQGwbbDIw/exec";
// 👆 Reemplaza TU_TOKEN_AQUI por el tuyo (copiado desde la publicación del Apps Script)

/**
 * Captura el formulario del HTML
 */
const form = document.getElementById("prosForm");
const mensaje = document.getElementById("mensaje");

/**
 * Escucha el evento "submit"
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita el recargo de página

  // 🔹 Convertir los datos del formulario en un objeto JSON
  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => (data[key] = value));

  // 🔹 Mostrar mensaje de carga
  mensaje.innerHTML = "Enviando datos... ⏳";

  try {
    // 🔹 Enviar datos al Apps Script
    const response = await fetch(scriptURL, {
      method: "POST",
      mode: "cors", // Permite CORS desde tu dominio GitHub Pages
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    // 🔹 Confirmar éxito
    if (result.success) {
      mensaje.innerHTML = "✅ Registro guardado exitosamente.";
      form.reset(); // Limpia el formulario
    } else {
      throw new Error(result.error || "Error desconocido");
    }
  } catch (error) {
    // ⚠️ Mostrar errores
    console.error("❌ Error al enviar:", error);
    mensaje.innerHTML = "❌ No se pudo enviar el registro. Revisa la consola.";
  }
});
