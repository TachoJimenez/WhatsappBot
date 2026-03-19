# Diagramas de Casos de Uso: Bot de Soporte Integral

A continuación se presentan los diagramas de Casos de Uso (Use Cases) del sistema que hemos construido. Están divididos por el **Actor Principal** para que sean fáciles de leer e interpretar si los necesitas para documentación técnica o académica.

## 1. Casos de Uso del Cliente (Usuario Final)
Este diagrama ilustra todas las acciones que un cliente puede realizar al interactuar con el bot de WhatsApp o al enviar un correo, así como las respuestas que obtiene del sistema.

```mermaid
flowchart LR
    %% Definir Actor
    Cliente("👤 Cliente (WhatsApp / Correo)")
    
    %% Casos de Uso del Sistema WhatsApp
    subgraph WhatsApp Bot
        UC1(["Registrarse como Usuario Nuevo"])
        UC2(["Entrar como Invitado"])
        UC3(["Crear Ticket de Soporte (Texto y Adjuntos)"])
        UC4(["Consultar Estado de Tickets Activos"])
        UC5(["Recibir Alerta de Mantenimiento"])
    end
    
    %% Casos de Uso Externos
    subgraph Notificaciones y Correo
        UC6(["Crear Ticket vía Correo Electrónico"])
        UC7(["Recibir Notificación por Email (Ticket Creado)"])
    end

    %% Relaciones
    Cliente -->|Envía 'menu'| UC1
    Cliente -->|Envía 'menu'| UC2
    Cliente -->|Opciones WhatsApp| UC3
    Cliente -->|Opciones WhatsApp| UC4
    Cliente -->|Alerta Bloqueante| UC5
    
    Cliente -->|Envía a Buzón IMAP| UC6
    UC7 -.->|El Sistema Notifica a| Cliente
```

---

## 2. Casos de Uso del Administrador / Agente de Soporte
Este diagrama detalla todas las acciones gerenciales y de gestión que tienes tú como Administrador o Agente de Soporte al utilizar tu Panel React CRM y las plataformas de Tickets.

```mermaid
flowchart LR
    %% Definir Actor
    Agente("🛠️ Administrador / Agente de Soporte")
    
    %% Casos de Uso del Panel React
    subgraph Dashboard CRM React
        UC8(["Visualizar Mapa de Calor Predictivo de Fallas"])
        UC9(["Consultar Expediente del Cliente (Historial Tickets)"])
        UC10(["Activar/Desactivar Modo Mantenimiento Web"])
        UC11(["Recibir Alerta Visual y Auditiva de Ticket Nuevo"])
    end
    
    %% Casos de Uso del Sistema de Gestión
    subgraph Plataformas Ticketing
        UC12(["Gestionar Ticket en osTicket (Asignar, Cerrar)"])
        UC13(["Descargar Adjuntos (Imágenes, Videos)"])
        UC14(["Exportar (Clonar) Ticket Complejo a MantisBT"])
    end

    %% Relaciones
    Agente -->|Monitoreo React| UC8
    Agente -->|Consulta CRM| UC9
    Agente -->|Ajustes React| UC10
    UC11 -.->|El Sistema Alerta a| Agente
    
    Agente -->|Resolver desde SCP| UC12
    Agente -->|Ver Evidencia| UC13
    Agente -->|Clic en Botón Custom SCP| UC14
    
    %% Inclusiones (Includes)
    UC14 -.->|«include» Llama al Webhook Node.js| UC12
```

---

## 3. Casos de Uso del Backend Automático (El Sistema en la Sombra)
Este diagrama muestra cómo los distintos servidores (Node.js, MySQL, Mantis API) se comunican invisiblemente por detrás sin intervención humana.

```mermaid
flowchart TD
    %% Sistema Principal
    Bot["🤖 Motor Backend Node.js"]
    
    %% Acciones Autónomas
    subgraph Monitoreo y Procesamiento
        UC15(["Escanear/Sondear Buzón de Correo (IMAP) cada minuto"])
        UC16(["Procesar Consulta API de MantisBT en vivo"])
        UC17(["Alinear Variantes Telefónicas a Base de Datos Mexicana"])
        UC18(["Evitar Auto-Respuestas Ciclicas Preventivas"])
    end

    Bot --> UC15
    Bot --> UC16
    Bot --> UC17
    Bot --> UC18
```

> [!TIP] Documentación Extensible
> Si necesitas entregar esta documentación a tu escuela o jefe, estos gráficos en formato "Mermaid" son el estándar oficial en plataformas como GitHub y Notion. 
> Cada nodo ovalado representa un **Caso de Uso** (la acción y el objetivo), y los cuadritos al inicio representan al **Actor** que interactúa con el sistema.
