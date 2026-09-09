# Mi landing: implementación y activación

## Estado y archivos

Implementación local: editor `public/mi-landing.html`, catálogo `public/tienda.html`, tres plantillas, borradores, precios opcionales, WhatsApp comercial y accesos desde ambos gestores. El login conserva el destino del editor. La demo se abre con `/mi-landing.html?demo=1`; usa datos ficticios y no publica.

La activación real requiere desplegar el backend y conectar su URL al alojamiento actual. No se desplegó ni se modificaron reglas o datos de producción. Esta carpeta no contenía configuración de Firebase, credenciales de despliegue ni reglas vigentes; no se deben reemplazar las reglas existentes por un archivo de ejemplo.

## Privacidad como contrato

- La respuesta pública se construye con una lista explícita de campos permitidos. Nunca incluye cantidades, capacidad, ocupación, cuentas internas, clientes, contraseñas, PIN, costos o proveedores.
- Los precios desactivados se eliminan del JSON. No se ocultan solo con CSS.
- Solo se incluyen productos habilitados que tengan disponibilidad. No se publican cantidades ni avisos de pocas unidades.
- Los perfiles y cuentas completas comparten el inventario. Una venta completa ocupa todos los perfiles; una cuenta con un perfil vendido no se ofrece completa.
- Un cliente vencido sigue ocupando espacio hasta que el gestor lo archive como `No renovó` o `Retirado del combo`, coherente con el código actual.
- Las cuentas madre vencidas, sin fecha o con fecha inválida se excluyen. La fecha se evalúa en America/Lima; el día de vencimiento sigue habilitado. El proceso diario recalcula al iniciar el día, sujeto a su ejecución y a la caché.
- El WhatsApp es el del vendedor. Abrirlo no envía el mensaje, reserva inventario ni registra una venta.

## Datos y reducción de lecturas

`landing_private/{uid}` contiene borrador, versión de edición, configuración publicada, precios de venta y un resumen privado por cuenta (plataforma, disponibilidad booleana por modalidad, vencimiento). No contiene credenciales ni compradores. Se limita el documento a 750 KB y la configuración a 120 ofertas.

`landing_catalogs/{slug}` reserva la dirección de manera atómica y contiene propietario, revisión y respuesta pública depurada. Es una colección de servidor, no una colección de lectura pública del navegador. La dirección queda fija tras la primera publicación.

`landing-catalogs/{slug}.json` es un objeto **privado** de Cloud Storage. `GET landingApi/catalog/{slug}` lo sirve sin acceder a Firestore. No hace falta volver público el bucket ni crear enlaces con token de descarga. El endpoint público admite caché compartida por 30 segundos. Una CDN del alojamiento debe respetar ese encabezado para reducir también invocaciones y descargas de Storage. Sin CDN se mantienen cero lecturas de Firestore en las visitas, pero habrá una invocación y lectura de Storage por solicitud.

El visitante actualiza cada 60 segundos mientras la pestaña está visible y al regresar después de ese plazo. No hay listeners de Firestore ni persistencia offline del catálogo. La propagación total incluye procesamiento de eventos, exportación, caché y el siguiente refresco; **no es disponibilidad instantánea ni una garantía de actualización en 60 segundos**. La pausa también está sujeta a esta propagación.

Costos de sincronización:

- La primera apertura del editor lee cuentas y clientes una vez para crear el resumen.
- Cada apertura posterior usa el resumen; no vuelve a cargar todas las colecciones.
- Un cambio relevante de cuenta o cliente comprueba si existe la landing y relee solo la cuenta afectada y sus ocupantes, además de los documentos de control. Los cambios de contraseña/notas no generan lecturas del sincronizador.
- Un cambio que deja la disponibilidad pública igual no reescribe el catálogo. Por ejemplo, pasar de cuatro a tres perfiles disponibles mantiene la misma oferta.
- Los eventos relevantes de usuarios sin landing tienen una lectura de comprobación; no cargan inventario.
- Las importaciones grandes aún generan eventos por documento. Esta primera versión reduce las reescrituras por resultado idéntico, pero **no agrupa los eventos en una cola**. Medir lecturas/contención antes de ampliar a importaciones intensivas; una cola por vendedor es el siguiente paso si lo requiere el volumen.
- El proceso diario recorre solo las landings publicadas y utiliza resúmenes privados, sin volver a leer cuentas/clientes.
- Auth, Functions, Firestore de sincronización, Storage y transferencia conservan sus costos normales. No se registran visitas ni clics en Firestore.

## Backend

`functions/index.js` exporta:

- `landingApi`: editor autenticado, borrador, publicar, pausar y catálogo público.
- `landingAccountChanged`, `landingClientChanged`, `landingPricesChanged`: eventos del gestor.
- `landingOwnerChanged`: retira/restablece el catálogo según el estado del propietario, sin perder el borrador.
- `landingCatalogExport`: exportación con control de generación de Storage.
- `landingExpireAccounts`: vencimientos diarios en America/Lima.

El backend valida el ID token revocado, el usuario activo, origen autorizado, propiedad y versión del borrador. El comportamiento de acceso activo coincide con `isExpiredUser` del gestor; no agrega un criterio de suscripción distinto. Los cambios de stock se calculan con lecturas transaccionales del estado actual, tolerando eventos repetidos o fuera de orden. La exportación lee la revisión actual y usa `ifGenerationMatch`, evitando que una ejecución atrasada sobrescriba un catálogo más nuevo.

La configuración publicada y el borrador son independientes. Un cambio de precios del gestor solo afecta productos publicados con origen de precio `gestor` y visibilidad permitida. Las cuentas completas usan precio personalizado.

## Reglas e infraestructura a verificar antes de activar

1. Confirmar el alojamiento de `disenosstreaming.com`, la región real de Firestore y el bucket. Revisar las reglas vigentes, sin reemplazarlas completas.
2. Asegurar que los clientes Firebase, tanto anónimos como autenticados, **no puedan leer ni escribir** `landing_private` y `landing_catalogs`. Admin SDK las maneja desde el backend.
3. Asegurar que los clientes no puedan escribir ni descargar directamente el prefijo Storage `landing-catalogs/`; el endpoint lo lee con su cuenta de servicio. La cuenta de servicio necesita los permisos de Firestore y lectura/escritura de objetos correspondientes. No usar `allUsers` para el bucket.
4. Las reglas `allow ...: if false` no anulan otros permisos amplios coincidentes. Si existen comodines globales permisivos, excluir expresamente estas colecciones y ese prefijo de tales permisos.
5. Confirmar facturación/servicios necesarios para Cloud Functions, Eventarc, Cloud Scheduler y Storage. Configurar alertas de errores y consumo; comprobar que las exportaciones no estén fallando.

Fragmentos orientativos para integrar **solo tras revisar todas las coincidencias existentes**:

```text
// Dentro de match /databases/{database}/documents
match /landing_private/{document=**} { allow read, write: if false; }
match /landing_catalogs/{document=**} { allow read, write: if false; }

// Dentro de match /b/{bucket}/o en Storage
match /landing-catalogs/{object=**} { allow read, write: if false; }
```

## Despliegue

1. Instalar dependencias con `npm ci --prefix functions`. Usar Node 22 para el runtime de las funciones.
2. Crear `functions/.env` desde `.env.example`, ajustar región, bucket y orígenes. Nunca colocar credenciales de servidor en `public/`.
3. Ejecutar `node scripts/sync-landing-core.cjs` y `npm test --prefix functions`.
4. Con Firebase CLI autenticado para el proyecto existente: `firebase deploy --config firebase.landing.json --project plantillas-bfaeb --only functions:landing`. El archivo separado contiene solo este codebase; no contiene reglas ni configuración de hosting para sobrescribir las existentes. El nombre del proyecto se obtuvo del gestor y debe confirmarse con el administrador antes de activar.
5. Conectar la URL devuelta de `landingApi`:
   - Si se utiliza el servidor Node de esta carpeta: establecer `LANDING_API_URL` a la URL de la función y reiniciar el servidor. Mantener `public/js/landing/config.js` en `/api/landing`.
   - Si el alojamiento es estático: establecer `apiBase` en `public/js/landing/config.js` a la URL HTTPS de la función, o configurar un proxy equivalente. Añadir el origen del alojamiento a los orígenes autorizados si corresponde.
   - La URL pública inicial funciona con `tienda.html?s=nombre`. No requiere reescrituras. `/tienda/nombre` es una mejora pendiente del alojamiento; todavía no se anuncia en el editor.
6. Publicar los HTML, CSS y JS nuevos y las actualizaciones de gestor/login/service worker. `sw.js` usa v272 y excluye la API de landing de su caché.
7. Probar con dos usuarios de prueba: cada uno debe ver solo su borrador; el segundo no puede reservar la misma dirección. Publicar, vender el último perfil, comprobar su desaparición, renovar, editar precios, ocultarlos, pausar y comprobar retirada tras propagación. Verificar el JSON público y las denegaciones directas de las reglas.

## Pruebas locales

`npm test --prefix functions` ejecuta pruebas de reglas de catálogo y handlers con dobles deterministas de Firestore/Auth/Storage: privacidad, precios omitidos, ocupación, vencimientos, WhatsApp, orígenes, autenticación, conflicto de versiones/direcciones, borradores, pausa, eventos atrasados y carreras de exportación. No son pruebas contra el emulador ni contra producción; esas verificaciones y las reglas reales siguen pendientes de acceso al despliegue.

`node server.js` sirve el editor demo en `http://localhost:3000/mi-landing.html?demo=1`. El modo demo guarda solo una copia local explícita y no se presenta como una publicación real.

Fuente canónica de reglas de catálogo: `public/js/landing/core.js`; `scripts/sync-landing-core.cjs` copia al backend antes del despliegue. Una prueba asegura que ambas copias coinciden.

Referencias técnicas: [eventos Firestore](https://firebase.google.com/docs/functions/firestore-events), [facturación Firestore](https://firebase.google.com/docs/firestore/pricing), [precondiciones de Storage](https://cloud.google.com/storage/docs/request-preconditions).

## Formatos de landing

El editor incluye seis composiciones: Cine (`catalog`), Premiere (`elegant`), Express (`compact`), Estreno (`spotlight`), Neón (`neon`) y Cartelera (`magazine`). Estreno usa el primer producto destacado disponible en la portada; Neón ofrece un catálogo horizontal con navegación por botones, teclado y tacto; Cartelera usa tarjetas altas tipo póster. Todas respetan la marca, los precios opcionales y el WhatsApp del vendedor.

Los estilos adicionales están en `public/css/landing-formats.css`. Los logotipos e iconos se sirven localmente. Las animaciones son limitadas, respetan movimiento reducido y no consultan Firestore. Buscar, filtrar y cambiar el diseño utilizan el catálogo que ya está cargado.

Verificación local: 19 pruebas de catálogo/backend y comprobación de sintaxis de 21 scripts. Se revisaron los seis formatos en el editor y en móvil, el carrusel de Neón, la búsqueda y la eliminación de precios incluso en la portada de Estreno. El despliegue de producción sigue siendo un paso independiente.
La vista previa permite saltar a Portada, Catálogo y Contacto. Cambiar la plantilla o repetir la animación vuelve al inicio; el carrusel desactiva sus flechas en los extremos y ajusta el estado al filtrar o redimensionar.
