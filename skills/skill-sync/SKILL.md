---
name: skill-sync
description: >
  Meta-skill para sincronizar las tablas de Auto-invoke en AGENTS.md
  a partir del metadata.auto_invoke de cada SKILL.md.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke: []
---

## Propósito

Mantener sincronizada la tabla "Auto-invoke Skills" en `AGENTS.md` con los triggers definidos en cada `SKILL.md`.

## Uso

```bash
./skills/skill-sync/assets/sync.sh
```

## Qué hace

1. Escanea todos los `skills/*/SKILL.md`
2. Extrae el campo `metadata.auto_invoke` del YAML frontmatter
3. Regenera la tabla markdown en `AGENTS.md` entre los marcadores:
   - `### Auto-invoke Skills`
   - `<!-- Skills extracted from metadata.auto_invoke in each SKILL.md -->`

## Cuándo ejecutar

- Después de crear un nuevo skill
- Después de modificar `auto_invoke` en un SKILL.md existente
- Antes de commit si se tocaron skills

## Nota

El script `sync.sh` está en `skills/skill-sync/assets/sync.sh`.
Después de ejecutar sync.sh, ejecutar `./skills/setup.sh` para propagar a Copilot.
