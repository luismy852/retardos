const input = document.getElementById("buscador");
const lista = document.getElementById("sugerencias");
const listaAgregados = document.getElementById("lista"); // lista donde se agregan estudiantes
const estudiantesAgregados = new Set(); // para guardar ids únicos

input.addEventListener("input", async () => {
  const query = input.value;

  if (query.length < 2) { // espera mínimo 2 letras
    lista.innerHTML = "";
    return;
  }

  const response = await fetch(`http://localhost:8080/estudiantes/search?nombre=${query}`);
  const resultados = await response.json();

  lista.innerHTML = resultados
    .filter(est => est.idEstudiante !== undefined && est.idEstudiante !== null)
    .map(est => `<li data-id="${est.idEstudiante}">${est.nombre}</li>`)
    .join("");
});

// Agregar estudiante al hacer click en sugerencia
lista.addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    const id = e.target.getAttribute("data-id");
    const nombre = e.target.textContent;
    if (!id) {
      console.error("data-id undefined en el elemento seleccionado");
      return;
    }
    if (!estudiantesAgregados.has(id)) {
      estudiantesAgregados.add(id);
      const li = document.createElement("li");
      li.textContent = nombre;
      li.setAttribute("data-id", id);
      if (listaAgregados) {
        listaAgregados.appendChild(li);
        input.value = ""; // limpia el buscador
        lista.innerHTML = ""; // opcional: limpia sugerencias
      } else {
        console.error('Elemento con id "lista" no encontrado en el DOM.');
      }
    }
  }
});

// Usa los elementos ya existentes en el HTML
const fechaInput = document.getElementById("fecha-consulta");
const consultarBtn = document.getElementById("consultar-btn");

// --- DOCENTES: consulta y almacenamiento en localStorage ---
async function obtenerDocentes() {
  const hoy = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const docentesKey = "docentes";
  const docentesFechaKey = "docentes_fecha";
  let docentes = null;

  // Verifica si ya se consultó hoy
  if (localStorage.getItem(docentesKey) && localStorage.getItem(docentesFechaKey) === hoy) {
    try {
      docentes = JSON.parse(localStorage.getItem(docentesKey));
    } catch {
      docentes = null;
    }
  }

  // Si no hay datos o no son de hoy, consulta y guarda
  if (!docentes) {
    const response = await fetch("http://localhost:8080/docentes");
    docentes = await response.json();
    localStorage.setItem(docentesKey, JSON.stringify(docentes));
    localStorage.setItem(docentesFechaKey, hoy);
  }

  return docentes || [];
}

// Variable global para docentes
let docentesPorGrado = {};

// Al cargar la página, consulta docentes y crea el mapa grado->día->docente
(async () => {
  const docentes = await obtenerDocentes();
  console.log("Docentes obtenidos:", docentes); // Depuración: muestra el array recibido
  docentesPorGrado = {};
  if (Array.isArray(docentes) && docentes.length > 0) {
    docentes.forEach(doc => {
      // Usa los campos correctos del objeto docente
      if (doc.grado && doc.diaSemana && doc.nombreDocente) {
        const dia = doc.diaSemana.toUpperCase();
        if (!docentesPorGrado[doc.grado]) docentesPorGrado[doc.grado] = {};
        docentesPorGrado[doc.grado][dia] = doc.nombreDocente;
      }
    });
  } else {
    console.warn("No hay datos de docentes en localStorage o la estructura es incorrecta.");
  }
  // Depuración: muestra el objeto construido
  console.log("docentesPorGrado:", docentesPorGrado);
})();

consultarBtn.addEventListener("click", async () => {
  const fecha = fechaInput.value;
  if (!fecha) return;
  try {
    const response = await fetch(`http://localhost:8080/consultar/${fecha}`);
    const data = await response.json();

    // Obtiene el día de la semana en texto mayúsculas (usando zona local)
    const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
    const [year, month, day] = fecha.split("-");
    const fechaObj = new Date(Number(year), Number(month) - 1, Number(day));
    const diaTexto = diasSemana[fechaObj.getDay()];

    // Los docentes ya están en memoria en docentesPorGrado (desde localStorage)
    // Agrupa por grado
    const grados = {};
    data.forEach(item => {
      if (!grados[item.grado]) grados[item.grado] = [];
      grados[item.grado].push(item.nombreEstudiante);
    });

    // Construye el HTML agrupado con docente según día
    let resultadoDiv = document.getElementById("resultado-consulta");
    if (!resultadoDiv) {
      resultadoDiv = document.createElement("div");
      resultadoDiv.id = "resultado-consulta";
      document.body.appendChild(resultadoDiv);
    }
    resultadoDiv.innerHTML = ""; // limpia antes de mostrar

    Object.entries(grados).forEach(([grado, estudiantes]) => {
      // Busca el docente para el grado y día usando docentesPorGrado
      let docente = "";
      if (
        docentesPorGrado[grado] &&
        typeof docentesPorGrado[grado] === "object" &&
        docentesPorGrado[grado][diaTexto]
      ) {
        docente = docentesPorGrado[grado][diaTexto];
      }
      // Depuración: muestra el docente encontrado
      console.log(`Grado: ${grado}, Día: ${diaTexto}, Docente: ${docente}`);
      const docenteStr = docente ? ` - Docente: ${docente}` : " - Docente: NO ASIGNADO";
      const gradoTitulo = document.createElement("h3");
      gradoTitulo.textContent = `Grado: ${grado}${docenteStr}`;
      resultadoDiv.appendChild(gradoTitulo);

      const ul = document.createElement("ul");
      estudiantes.forEach(nombre => {
        const li = document.createElement("li");
        li.textContent = nombre;
        ul.appendChild(li);
      });
      resultadoDiv.appendChild(ul);
    });
  } catch (err) {
    console.error("Error consultando por fecha:", err);
  }
});

// Botón para registrar estudiantes
const registrarBtn = document.createElement("button");
registrarBtn.textContent = "Registrar estudiantes";
document.body.insertBefore(registrarBtn, listaAgregados.nextSibling);

registrarBtn.addEventListener("click", async () => {
  const ids = Array.from(listaAgregados.querySelectorAll("li"))
    .map(li => li.getAttribute("data-id"))
    .filter(id => !!id);

  if (ids.length === 0) {
    alert("No hay estudiantes para registrar.");
    return;
  }

  if (!confirm("¿Desea registrar estos estudiantes?")) return;

  try {
    let todosOk = true;
    for (const id of ids) {
      const response = await fetch("http://localhost:8080/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idEstudiante: Number(id) })
      });
      if (response.status !== 200) {
        todosOk = false;
      }
    }
    if (todosOk) {
      alert("Todos los estudiantes fueron registrados exitosamente.");
      listaAgregados.innerHTML = ""; // borra la lista
      estudiantesAgregados.clear();  // limpia el set
    } else {
      alert("Algunos estudiantes no se pudieron registrar.");
    }
  } catch (err) {
    console.error("Error registrando estudiantes:", err);
    alert("Ocurrió un error al registrar los estudiantes.");
  }
});
