# 🧠 Backend - IT Business Partner Planning Tool

Este repositorio contiene la API REST para la aplicación de planificación estratégica (Tótems interactivos). Su función principal es servir como **fuente de verdad centralizada** para sincronizar el estado entre múltiples pantallas táctiles durante el evento.

## 🚀 Contexto del Proyecto

Esta aplicación fue diseñada para un **evento de un solo día**. El objetivo era permitir a los usuarios interactuar con un tablero de planificación (Drag & Drop) en pantallas táctiles (Tótems).

**Requerimientos clave que definieron la arquitectura:**

1.  **Persistencia en tiempo real:** Si un usuario mueve una tarjeta en un tótem, el cambio debe guardarse.
2.  **Sincronización:** Si otro usuario entra con el mismo perfil en otro tótem, debe ver los datos actualizados.
3.  **Simplicidad:** No se requiere un modelo relacional complejo (SQL estricto) porque la estructura de datos del frontend ya estaba definida y fija.
4.  **Resiliencia:** Debe ser fácil de desplegar (Railway) y fácil de reiniciar (Reset de demo).

## 🛠 Tech Stack

- **Framework:** [NestJS](https://nestjs.com/) (Node.js) - Por su estructura modular y robustez.
- **Base de Datos:** PostgreSQL - Elegida por su compatibilidad nativa con Railway.
- **ORM:** [Prisma](https://www.prisma.io/) - Para un manejo de tipos seguro y migraciones rápidas.
- **Infraestructura:** Railway (PaaS).

## 🏗 Arquitectura y Decisiones de Diseño

### 1. Modelo de Datos Híbrido (JSONB)

A diferencia de una base de datos relacional tradicional donde tendríamos tablas para `Initiatives`, `Quarters` y una tabla intermedia `InitiativeQuarters`, aquí decidimos usar **columnas JSON**.

**¿Por qué?**

- El frontend maneja objetos complejos para las horas (`{ q1: 10, q2: 0... }`) y asignaciones (`['q1', 'q3']`).
- Mapear esto a tablas relacionales hubiera requerido mucha lógica de transformación (DTOs complejos) innecesaria para un MVP.
- **Solución:** Guardamos estos objetos tal cual vienen del frontend en columnas `Json` de Postgres. Esto hace que la lectura y escritura sean rapidísimas y el código del backend sea mínimo.

### 2. Endpoint de "Pánico" (Reset)

Se implementó un endpoint `/reset` que borra la base de datos y la repuebla con la data inicial (`seed`).

**¿Por qué?**

- Al ser una demo para un evento, después de que un usuario termina o si algo sale mal, necesitamos volver al estado original ("limpio") rápidamente sin tener que reiniciar el servidor o correr scripts manuales.

### 3. CORS Abierto

Se habilitó CORS para cualquier origen (`app.enableCors()`).

**¿Por qué?**

- En el entorno del evento, no sabíamos qué IPs tendrían los tótems o si correrían desde `localhost` o una IP local. Abrir CORS elimina problemas de conectividad durante la demo.

## 🔌 API Endpoints

### `GET /initiatives`

Obtiene el estado actual de todas las iniciativas.

- **Uso:** Al cargar la aplicación en el frontend.

### `PATCH /initiatives/:id`

Actualiza una iniciativa específica.

- **Body:** Puede recibir `hours` (objeto) o `assignedQuarters` (array).
- **Uso:** Se llama cada vez que el usuario hace Drag & Drop, edita horas en la modal o elimina una tarjeta.

### `POST /reset`

Reinicia la base de datos al estado original.

- **Uso:** Botón de administración o reinicio de demo.

## 💻 Instalación y Ejecución Local

1.  **Instalar dependencias:**

    ```bash
    npm install
    ```

2.  **Configurar Base de Datos:**
    Crea un archivo `.env` en la raíz y añade la URL de tu base de datos local o remota:

    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/planning_db?schema=public"
    ```

3.  **Sincronizar Prisma:**
    Esto crea las tablas en la BD basándose en `schema.prisma`.

    ```bash
    npx prisma db push
    ```

4.  **Correr el servidor:**
    ```bash
    npm run start:dev
    ```
    El servidor correrá en `http://localhost:3000`.

## 🚀 Despliegue en Railway

1.  Subir el código a GitHub.
2.  Crear nuevo proyecto en Railway desde el repo.
3.  Añadir un servicio de **PostgreSQL** en Railway.
4.  Railway inyectará automáticamente la variable `DATABASE_URL`.
5.  **Importante:** En la configuración del servicio (Settings) -> **Build Command**, asegúrate de poner:
    ```bash
    npx prisma generate && npx prisma db push && npm run build
    ```
    Esto asegura que Prisma genere el cliente y actualice la estructura de la BD en cada deploy.

---

_Proyecto desarrollado para evento ITBP - [Fecha]_
