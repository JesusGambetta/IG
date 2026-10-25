# Verificación de entrega — 24 de octubre de 2026

## Resultado

- 11 pruebas de lógica e importación CSV aprobadas.
- 5 pruebas de navegador Chromium aprobadas (código de salida 0).
- Compilación TypeScript y Vite de producción aprobada.
- Construcción y navegación bajo `/instagram-stream-ranking/`, equivalente a un repositorio en GitHub Pages.
- Dashboard revisado visualmente con observaciones reales. Responsividad comprobada a 390 px.
- Overlay `/overlay/` y `?compact=1` comprobados, fondo RGBA transparente.
- Auditoría npm: 0 vulnerabilidades reportadas al instalar la versión corregida de csv-parse.

## Consulta real de los cinco perfiles

Playwright abrió los cinco perfiles públicos sin sesión el 24/10/2026, aproximadamente a las 17:08 ART. Se almacenaron estas observaciones en `data/store.json`:

| Cuenta | Cifra visible | Valor guardado | Precisión |
|---|---:|---:|---|
| @juanofabiani | 11.7K | 11700 | Aproximada |
| @mariano.cascallares | 48.1K | 48100 | Aproximada |
| @paulaeichel | 7,676 | 7676 | Exacta |
| @nicolas.jawtuschenko | 3,788 | 3788 | Exacta |
| @leperejose | 10.2K | 10200 | Aproximada |

No son cifras simuladas. Las marcas de tiempo individuales y los textos de evidencia están en el JSON. La prueba inicial detectó diferencias entre la descripción SEO y el encabezado visible; esos intentos fallidos permanecen registrados. La implementación final prioriza el encabezado visible y usa la descripción solo cuando no hay lectura allí.

No se generó una semana ficticia ni se rellenó historial anterior. Las cifras abreviadas no se utilizan para asignar puestos exactos. Las pruebas de ranking y animación usan datos artificiales únicamente dentro de fixtures y respuestas interceptadas del navegador.

## Entorno y límites de la verificación

Se ejecutó en Windows, Node.js 24 y Chromium instalado por Playwright. Las cinco pruebas finales usaron `PLAYWRIGHT_BASE_URL` apuntando a un preview ya iniciado: el cierre automático del servidor de pruebas quedó bloqueado por el entorno Windows aislado. La configuración admite ese modo; el workflow Linux utiliza el servidor automático habitual.

No se ejecutó un workflow dentro de una cuenta de GitHub ni un despliegue remoto porque no se indicó un repositorio de destino. La compilación, el JSON público, la ruta de Pages y la interfaz se verificaron localmente. La disponibilidad futura de Instagram y la puntualidad de GitHub Actions no pueden garantizarse; los estados de error, preservación de datos y cierres demorados están implementados.

Consultar `README.md` para subir el proyecto, habilitar Pages, ejecutar el workflow y revisar el resultado.
