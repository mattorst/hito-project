# Hito

> Plataforma SaaS Offline-First para la gestión de seguridad y seguimiento de excursionistas en parques y reservas naturales.

---

## Descripción

Hito es una plataforma diseñada para modernizar el proceso de registro y monitoreo de excursionistas, reemplazando los libros físicos utilizados por los guardaparques por una solución digital robusta, escalable y capaz de operar incluso sin conexión a Internet.

El sistema está compuesto por una aplicación móvil para excursionistas y un panel web para guardaparques, permitiendo registrar recorridos, monitorear grupos activos, reportar incidentes y gestionar alertas de seguridad.

La arquitectura del proyecto sigue un enfoque **Offline-First**, garantizando que las funcionalidades críticas continúen operando en zonas sin cobertura y sincronizando automáticamente la información cuando la conectividad sea restablecida.

---

## Objetivos del proyecto

- Digitalizar el registro de excursionistas.
- Mejorar la seguridad en parques y reservas.
- Permitir operación completamente Offline-First.
- Automatizar alertas por retrasos.
- Facilitar la gestión de rescates.
- Mantener un historial completo de recorridos e incidentes.

---

## Arquitectura General

```text
                ┌────────────────────┐
                │  Aplicación Móvil  │
                │ React Native + Expo│
                └─────────┬──────────┘
                          │
          Offline Storage │
         SQLite / AsyncStorage
                          │
                          │ Sincronización
                          ▼
                ┌────────────────────┐
                │ Django REST API    │
                └─────────┬──────────┘
                          │
                  MySQL Database
                          │
                          ▼
                ┌────────────────────┐
                │ Panel Guardaparques│
                │ Django Templates   │
                └────────────────────┘
```

---

## Stack Tecnológico

### Backend

- Django
- Django REST Framework
- MySQL

### Panel Web

- Django Templates
- Tailwind CSS
- JavaScript (Fetch API)

### Aplicación Móvil

- React Native
- Expo
- React Navigation
- Expo Camera
- Expo Location
- React Native Maps
- SQLite
- AsyncStorage

---

## Estructura del repositorio

```text
hito-project/
│
├── backend/        # Backend Django + API REST + Panel Web
├── mobile/         # Aplicación móvil React Native (Expo)
├── docs/           # Documentación técnica
├── scripts/        # Scripts auxiliares
│
├── .gitignore
└── README.md
```

---

## Estado del desarrollo

| Fase | Estado |
|------|--------|
| Estructura del proyecto | ✅ |
| Backend Django | ⏳ |
| API REST | ⏳ |
| Aplicación móvil | ⏳ |
| Panel Web | ⏳ |
| Offline-First | ⏳ |
| Motor de alertas | ⏳ |
| Despliegue | ⏳ |

---

## Licencia

Pendiente de definir.


## Autenticación JWT

### Obtener tokens

POST /api/token/

```json
{
  "username": "admin",
  "password": "********"
}
```

Respuesta:

```json
{
  "refresh": "...",
  "access": "..."
}
```

### Renovar token

POST /api/token/refresh/

```json
{
  "refresh": "..."
}
```

Respuesta:

```json
{
  "access": "..."
}
```

Los endpoints protegidos requieren el encabezado:

Authorization: Bearer <access_token>