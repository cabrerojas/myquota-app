# Skills — MyQuota App

Este directorio contiene **skills modulares** para guiar a agentes de IA en el desarrollo de `myquota-app`.

## Setup

```bash
# Configurar compatibilidad con GitHub Copilot
./skills/setup.sh

# Sincronizar auto-invoke tables después de modificar skills
./skills/skill-sync/assets/sync.sh
```

## Available Skills

| Skill           | Propósito                                                |
| --------------- | -------------------------------------------------------- |
| `expo-module`   | Crear features completos (screens, services, components) |
| `expo-routes`   | expo-router patterns, layouts, navegación                |
| `expo-services` | Servicios API con requestWithAuth                        |
| `expo-auth`     | useAuth hook, token management, Google Sign-In           |
| `expo-screens`  | Screens con data fetching, estados loading/error         |
| `expo-types`    | TypeScript patterns, interfaces compartidas              |
| `expo-theme`    | Theme tokens, StyleSheet patterns                        |
| `sync-types`    | Sincronización de tipos backend→frontend                 |
| `skill-sync`    | Meta: sincroniza auto-invoke tables                      |

## Estructura

```
skills/
├── README.md                   # Este archivo
├── setup.sh                    # Copia AGENTS.md → .github/copilot-instructions.md
├── skill-sync/
│   ├── SKILL.md
│   └── assets/sync.sh          # Regenera Auto-invoke table
├── expo-module/SKILL.md
├── expo-routes/SKILL.md
├── expo-services/SKILL.md
├── expo-auth/SKILL.md
├── expo-screens/SKILL.md
├── expo-types/SKILL.md
├── expo-theme/SKILL.md
└── sync-types/SKILL.md
```

## Crear un Nuevo Skill

1. Crear directorio: `skills/<skill-name>/`
2. Crear `SKILL.md` con YAML frontmatter:

```yaml
---
name: my-skill
description: >
  Descripción del skill.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Action that triggers this skill"
---
```

3. Agregar contenido markdown con templates, ejemplos, checklist
4. Ejecutar `./skills/skill-sync/assets/sync.sh`
5. Ejecutar `./skills/setup.sh`

## Flujo de Trabajo

1. **Nuevos features**: Lee `expo-module` primero, luego los skills específicos que necesites
2. **Pantallas con datos**: Lee `expo-screens` para el patrón de loading/error
3. **Llamadas API**: Lee `expo-services` para el patrón con requestWithAuth
4. **Estilos**: Lee `expo-theme` para usar tokens correctamente
5. **Tipos**: Lee `expo-types` para interfaces y sync con backend
