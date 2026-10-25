# Instagram Stream Ranking

Aplicación funcional en React + Vite + TypeScript, Tailwind CSS y Recharts, con extractor Node.js/Playwright Chromium, persistencia JSON y despliegue en GitHub Pages. No requiere credenciales de Instagram ni Meta Developers.

## Inicio local

Requisitos: Node.js 24 LTS y npm. Desde esta carpeta:

```sh
npm ci
npx playwright install chromium
npm run publish:data
npm run dev
```

Abrir la dirección que imprime Vite. Para probar la versión de producción:

```sh
npm test
npm run build
npm run test:e2e
npm run preview
```

## Subir a GitHub y activar Pages

1. Crear un repositorio vacío en GitHub, preferentemente público. **Esta carpeta debe ser la raíz del repositorio**, incluyendo `.github/`, `data/` y `package-lock.json`.
2. En una terminal abierta en esta carpeta:

```sh
git init
git branch -M main
git add .
git commit -m "Implementar Instagram Stream Ranking"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

3. En **Settings → Pages → Build and deployment → Source**, seleccionar **GitHub Actions**. En **Settings → Actions → General**, permitir Actions y permisos de lectura/escritura del workflow. Si hay reglas de protección de `main`, permitir la escritura del bot o configurar una excepción explícita; no desactivar protecciones sin revisar la política del repositorio.
4. En **Actions → Medir, cerrar y publicar → Run workflow**, usar la rama `main`. Puede desmarcarse `extract` para publicar sin consultar Instagram. El workflow rechazará otras ramas.
5. Abrir la URL del paso **Publicar**, normalmente `https://TU_USUARIO.github.io/TU_REPOSITORIO/`. El workflow configura automáticamente la ruta base, incluyendo repositorios `usuario.github.io`.

El proyecto está preparado para publicación, pero no crea un repositorio ni afirma un despliegue remoto sin ejecutarlo en tu cuenta. Para dominio personalizado, cambiar `BASE_PATH` a `/` en el workflow y configurar el dominio en Pages.

## Horarios y demoras

Zona de negocio: `America/Argentina/Buenos_Aires`. Los cron se expresan en UTC, con equivalencia argentina UTC−3:

| Tarea | Argentina | Cron UTC |
|---|---|---|
| Consultar los cinco perfiles | Diario 20:45 | `45 23 * * *` |
| Cerrar semana y desplegar | Domingo 21:00 | `0 0 * * 1` |
| Recuperar cierres/despliegues pendientes | Minuto 17 de cada hora | `17 * * * *` |

Un único workflow agrupa extracción, importación, cierre, pruebas, commit y despliegue. La concurrencia compartida y `cancel-in-progress: false` impiden dos escritores simultáneos. El checkout lee `main` al empezar. Un push concurrente externo que produzca conflicto hace fallar el push: no hay force push, rebase automático ni sobrescritura; volver a ejecutar. Las escrituras JSON usan archivo temporal y rename. No ejecutar scripts de escritura locales simultáneamente ni editar `data/store.json` a mano mientras corren.

GitHub Actions **no garantiza ejecutar ni publicar exactamente a las 21:00**: puede demorar o perder ejecuciones. El cierre lógico siempre es a las 21:00; la web se actualiza cuando termina el despliegue. Hasta entonces indica publicación pendiente y conserva el resultado anterior. El reintento horario recupera todas las semanas vencidas; nunca usa observaciones posteriores al cierre para completar esa semana. Los workflows programados requieren estar en la rama predeterminada y GitHub puede desactivarlos por inactividad del repositorio público.

Documentación: [eventos programados y demoras de GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [publicar con workflows personalizados](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages-to-deploy-your-site).

## Medición real y respaldo

```sh
npm run extract
npm run close
npm run build
```

El extractor abre cada perfil sin sesión, lee el encabezado visible (incluidos títulos públicos de seguidores) y, si no hay cifra allí, intenta la descripción pública. El encabezado tiene prioridad porque la descripción SEO puede estar atrasada. No utiliza endpoints privados, cookies de usuario, proxies rotativos, resolución de CAPTCHA ni evasión de restricciones. HTTP de error, login, CAPTCHA o cifras contradictorias se registran como fallo. No hay reintentos agresivos.

Cada observación guarda cuenta, fecha/hora real de lectura, cantidad, precisión, fuente y texto de evidencia. Cada intento guarda resultado y diagnóstico. Ante fallos se mantiene la última observación válida sin modificar su fecha: no se añade un punto ficticio ni un cero. Las cifras abreviadas se guardan como aproximadas y se muestran con `≈`. Los logs JSONL están en `logs/` y en los artifacts de Actions (14 días); `data/store.json` conserva el historial de observaciones e intentos.

### CSV

Crear un archivo UTF-8 con este encabezado y agregar **únicamente observaciones reales**:

```csv
account,observed_at,followers,approximate,evidence
```

- `account`: uno de los cinco nombres, con o sin `@`.
- `observed_at`: fecha/hora real de observación en ISO 8601, con zona, por ejemplo formato `AAAA-MM-DDT20:45:00-03:00`. No usar fecha futura ni inventar una observación retroactiva.
- `followers`: entero sin separadores.
- `approximate`: `false` para un número exacto; `true` si proviene de una abreviatura.
- `evidence`: descripción de la fuente y de cómo se obtuvo la cifra. Si contiene comas, encerrar en comillas CSV. No incluir información privada: estos datos serán públicos.

```sh
npm run import:csv -- mediciones.csv
npm run close
npm run build
```

Alternativa sin terminal: **Run workflow**, desmarcar `extract` y pegar el CSV completo (encabezado y filas) en `csv`. El CSV entra como variable de entorno, nunca como código de shell. Una fila inválida rechaza la importación completa. La misma cuenta/hora/valor es idempotente; un valor diferente para esa cuenta/hora se rechaza. No se sobrescriben observaciones ni rankings ya publicados. Datos ingresados después del cierre pueden enriquecer el historial, pero no modificar el resultado cerrado.

## Reglas competitivas explícitas

- Período: lunes 00:00 a domingo 21:00, Argentina.
- Base: última lectura **exacta** anterior o igual al lunes 00:00, de no más de 36 horas de antigüedad. Normalmente corresponde al domingo anterior, 20:45.
- Cierre: última lectura **exacta** anterior o igual al domingo 21:00, posterior al inicio y de no más de 36 horas de antigüedad. Si falla el domingo puede utilizarse la del sábado; ambas fechas quedan documentadas en el resultado.
- Puntaje: cierre menos base; puede ser positivo, cero o negativo. Son valores observados cercanos a los límites, no una afirmación de medición exacta en el segundo del corte.
- Sin base/cierre comparables: cuenta excluida con motivo; no se inventa puntaje. El primer período puede no tener base.
- Cantidades abreviadas no deciden puestos: la precisión pública no alcanza para calcular seguidores netos exactos. Usar respaldo exacto si está disponible.
- Empates: comparten posición, por ejemplo `1, 1, 3`. Si hay empate en el primer puesto se celebran todos los ganadores. El orden alfabético entre empatados solo estabiliza la presentación.
- El cierre es inmutable e idempotente; conserva las observaciones utilizadas dentro del resultado semanal.

No se genera ni distribuye una clasificación oficial de la semana abierta. **Mostrar crecimiento semanal e historial públicamente permite deducir el orden**. Un repositorio público y un sitio estático no pueden ocultar ese cálculo a quien lo haga por su cuenta. La ocultación se aplica a la clasificación oficial y a su presentación, no al secreto de los datos que pediste mostrar.

## Dashboard y OBS

El dashboard mantiene las cuentas en orden fijo, muestra estado, última observación, variación respecto del día argentino anterior y crecimiento competitivo de la semana. Un guion significa falta de datos comparables, nunca cero. Historial de 7/30/90 días o completo; filtros por cuenta y comparación absoluta o cambio desde el primer día visible. Los huecos diarios no se rellenan. Una lectura de más de 36 horas se identifica como desactualizada.

En OBS, crear una **fuente Navegador**, ancho **1920**, alto **1080**:

- Normal: `https://TU_USUARIO.github.io/TU_REPOSITORIO/overlay/`
- Compacto: `https://TU_USUARIO.github.io/TU_REPOSITORIO/overlay/?compact=1`

El fondo del documento es transparente; el panel se ubica arriba a la izquierda y puede posicionarse con las herramientas de OBS. La ruta tiene un `index.html` físico: no depende de reescrituras SPA incompatibles con Pages. No hay administración en el overlay. La animación empieza desde el último puesto al cargar un resultado nuevo; se puede repetir con el botón `↻ Repetir` mediante Interactuar en OBS. Empatados se revelan juntos. Se respeta `prefers-reduced-motion`.

El cliente consulta el JSON cada 60 segundos y conserva su última versión si la red falla. La hora del dispositivo controla la cuenta regresiva; el resultado oficial se genera en el runner después del cierre.

## Archivos principales

- `src/core.ts`: horarios, validación, crecimiento y cierres.
- `scripts/extract.ts`, `scripts/normalize.ts`: Playwright y normalización pública.
- `scripts/import.ts`: importación transaccional CSV.
- `scripts/close.ts`: recuperación y cierre de semanas.
- `data/store.json`: fuente de persistencia versionada.
- `scripts/publish.ts`: copia pública de datos; no calcula clasificación abierta.
- `src/main.tsx`, `src/style.css`: dashboard y overlay.
- `.github/workflows/update.yml`: automatización completa.
- `tests/`: pruebas unitarias, importación y navegador. Sus fixtures son artificiales y nunca se publican como mediciones.

## Verificación operativa

1. Ejecutar el workflow manual con `extract` activado.
2. Revisar el paso **Extraer perfiles** y descargar el artifact de diagnóstico. Un workflow exitoso puede contener consultas fallidas: el estado de cada cuenta es la fuente de verdad.
3. Confirmar el commit de datos y revisar `data/store.json`: observaciones nuevas solo cuando la lectura fue válida.
4. Abrir dashboard y `/overlay/`; verificar última lectura, estado y transparencia en OBS.
5. Después del domingo 21:00, revisar `weeks`: `close` marca el corte, `publishedAt` la ejecución real y cada entrada contiene base y cierre. Si no hay datos suficientes, deben aparecer exclusiones, no resultados ficticios.

Las pruebas incluyen normalización, crecimiento negativo, empates, faltantes, horario argentino, límite exacto de revelación, demoras, recuperación, inmutabilidad, CSV, interfaz responsive, filtros, ruta de OBS y animación. Para verificar el caso de Pages bajo subdirectorio, compilar y probar con la misma variable `BASE_PATH=/nombre-repositorio/` en ambos comandos (PowerShell: `$env:BASE_PATH='/nombre-repositorio/'`).

Si ya hay un preview iniciado, se puede establecer `PLAYWRIGHT_BASE_URL` a su URL completa (incluido el subdirectorio y la barra final). En ese modo las pruebas no inician ni detienen otro servidor. La verificación de esta entrega se documenta en `VERIFICACION.md`.
