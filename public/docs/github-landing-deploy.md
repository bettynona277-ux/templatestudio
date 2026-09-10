# Despliegue seguro de la landing

La web se sigue desplegando desde GitHub hacia Railway. Firebase recibe solo el
codebase `landing` mediante el workflow `.github/workflows/landing-functions.yml`.
No se despliegan Hosting, reglas de Firestore, Storage ni otras funciones.

## Configuración de una sola vez

1. En GitHub crea las variables de Actions:
   - `FIREBASE_PROJECT_ID`: `plantillas-bfaeb`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`: proveedor OIDC de Google Cloud
   - `GCP_SERVICE_ACCOUNT`: cuenta de servicio de despliegue
   - `LANDING_REGION`: `us-central1`
   - `LANDING_BUCKET`: el bucket existente de Firebase Storage
   - `LANDING_ALLOWED_ORIGINS`: `https://disenosstreaming.com`
2. Configura el proveedor OIDC siguiendo la documentación de Google. No subas
   claves JSON ni archivos `.env` al repositorio.
3. Cuando la primera ejecución publique `landingApi`, copia su URL completa.
4. En Railway crea la variable `LANDING_API_URL` con esa URL, sin comillas ni
   barra final. Railway redeplegará la web automáticamente.

## Comprobación

Después del redeploy de Railway, abrir
`https://disenosstreaming.com/api/landing/editor` sin sesión debe devolver JSON
con estado 401. Si devuelve HTML, Railway aún no está aplicando el proxy.

El workflow ejecuta pruebas antes del despliegue y solo se activa al cambiar los
archivos del backend de landing o al iniciarlo manualmente desde Actions.
