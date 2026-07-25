# Changelog

Todas las novedades y cambios notables en el backend de Hito serán documentados en este archivo.

## [1.0.0] - Release Inicial Backend API

### Added
- **Arquitectura Modular:** Separación clara por aplicaciones Django (`accounts`, `parks`, `trekkings`, `incidents`, `rescues`, `sync`, `shared`).
- **Modelado de Dominio:** Modelos con reglas de negocio encapsuladas y validaciones de integridad `clean()`.
- **Autenticación JWT:** Endpoints de autenticación mediante SimpleJWT (`/api/token/` y `/api/token/refresh/`).
- **API REST & Serializers:** Endpoints de consulta y transaccionales protegidos con `IsAuthenticated` y asociación automática de `request.user`.
- **Sincronización Offline-First:** Endpoint `/api/sync/` para ingesta por lotes con manejo y reporte individual de errores.
- **Documentación OpenAPI 3.0:** Integración con `drf-spectacular`, interfaz Swagger UI y ReDoc con soporte Bearer Token.
- **Pruebas Automatizadas:** Suite completa con 31 tests unitarios e integrados pasando en verde.