# Hito

<p align="center">
  <img src="docs/hito_logo" alt="Logo de Hito" width="180" />
</p>

> Plataforma SaaS Offline-First para la gestión de seguridad y seguimiento de excursionistas en parques y reservas naturales.

---

## Descripción

Hito es una plataforma diseñada para modernizar el proceso de registro y monitoreo de excursionistas, reemplazando los libros físicos utilizados por los guardaparques por una solución digital robusta, escalable y capaz de operar incluso sin conexión a Internet.

El sistema está compuesto por una aplicación móvil para excursionistas y un panel web para guardaparques, permitiendo registrar recorridos, monitorear grupos activos, reportar incidentes y gestionar alertas de seguridad.

---

## Características

- **Sincronización Offline-First:** Procesamiento e ingesta por lotes con manejo individual de errores.
- **Autenticación Segura JWT:** Emisión y renovación de tokens vinculados automáticamente al usuario autenticado.
- **Modelado de Dominio Robusto:** Reglas de negocio encapsuladas en modelos con validaciones de integridad.
- **Documentación OpenAPI 3.0:** Swagger UI interactivo con soporte de autenticación Bearer Token y ReDoc.
- **Auditoría y Testing:** Cobertura de pruebas unitarias e integración para el dominio y endpoints.

---

## Stack Tecnológico

### Backend API (v1.0.0)

- **Lenguaje:** Python 3.11+
- **Framework:** Django 5.x / Django REST Framework
- **Autenticación:** SimpleJWT
- **Documentación:** drf-spectacular (OpenAPI 3.0)
- **Base de Datos:** SQLite (Desarrollo) / MySQL (Producción)

### Aplicación Móvil (En desarrollo)

- **Framework:** React Native / Expo
- **Navegación:** Expo Router
- **Almacenamiento Local:** SQLite & AsyncStorage
- **Características:** Expo Location & Camera

---

## Arquitectura

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
                  MySQL / SQLite Database
                          │
                          ▼
                ┌────────────────────┐
                │ Panel Guardaparques│
                │ Django Templates   │
                └────────────────────┘
```

---

## Estructura del Proyecto

```text
backend/
│
├── apps/
│   ├── accounts/     # Usuarios y autenticación JWT
│   ├── parks/        # Parques, senderos y checkpoints (puntos de control)
│   ├── trekkings/    # Registro, seguimiento y cierre de recorridos
│   ├── incidents/    # Reportes de incidentes en ruta
│   ├── rescues/      # Coordinación y estados de rescates
│   ├── sync/         # Sincronización offline-first por lotes
│   └── shared/       # Respuestas estandarizadas y utilidades
│
├── config/           # Configuración global de Django (settings, urls)
├── media/            # Archivos e imágenes subidas
├── requirements.txt  # Dependencias del proyecto
├── schema.yml        # Especificación OpenAPI congelada
└── manage.py         # Script de gestión de Django
```

---

## Instalación

1. Entrar a la carpeta del backend:
```powershell
   cd backend
```

2. Crear y activar el entorno virtual:
```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
```

3. Instalar dependencias:
```powershell
   pip install -r requirements.txt
```

### Variables de Entorno

Crea un archivo `.env` en la raíz de `backend/` basándote en `.env.example`:

```
SECRET_KEY=tu_secret_key_aqui
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
```

### Migraciones

Para crear y aplicar la estructura de la base de datos:
```powershell
python manage.py migrate
```

### Creación de Superusuario

Para acceder al panel de administración de Django:
```powershell
python manage.py createsuperuser
```

### Ejecución del Servidor

Para levantar la API localmente:
```powershell
python manage.py runserver
```

### Ejecución de Pruebas

Para correr la suite completa de tests automatizados (31 tests):
```powershell
python manage.py test apps
```

## Documentación Swagger

Con el servidor corriendo, puedes acceder a la documentación interactiva en:

- **Swagger UI:** http://127.0.0.1:8000/api/docs/
- **ReDoc:** http://127.0.0.1:8000/api/redoc/
- **Esquema OpenAPI (YAML):** http://127.0.0.1:8000/api/schema/

## Autenticación JWT

### Obtener Tokens

`POST /api/token/`
```json
{
  "username": "usuario",
  "password": "password"
}
```

### Renovar Token

`POST /api/token/refresh/`
```json
{
  "refresh": "<refresh_token>"
}
```

Los endpoints protegidos requieren el encabezado:
```
Authorization: Bearer <access_token>
```

## Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/token/` | Obtener tokens JWT |
| POST | `/api/token/refresh/` | Renovar token de acceso |
| GET | `/api/parks/` | Lista de parques y senderos |
| POST | `/api/trekkings/start/` | Iniciar un trekking |
| POST | `/api/trekkings/<id>/finish/` | Finalizar trekking activo |
| POST | `/api/checkpoint-records/` | Registrar checkpoint alcanzado |
| POST | `/api/incidents/` | Reportar incidente |
| POST | `/api/sync/` | Sincronización por lotes Offline-First |

## Roadmap

- [x] v1.0.0: API REST Backend, JWT, Swagger y Sincronización Offline.
- [x] API Freeze v1.0.0: Contrato congelado.
- [ ] Móvil M1-M10: Desarrollo en React Native + Expo.
- [ ] Panel Web: Gestión de alertas para guardaparques.

## Licencia

Propiedad exclusiva de Hito Project.