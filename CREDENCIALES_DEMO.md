# Credenciales de prueba — PayFlow

> ⚠️ Este archivo es solo para uso interno y entornos de desarrollo.
> **No compartir en producción.**

## Usuarios del seed

| Rol   | Email                   | Contraseña  | Alias                  |
|-------|-------------------------|-------------|------------------------|
| ADMIN | admin@payflow.local     | Admin1234!  | admin.payflow.9999     |
| USER  | user1@payflow.local     | User1234!   | juan.perez.1234        |
| USER  | user2@payflow.local     | User1234!   | maria.gonzalez.5678    |

## CVU de prueba

| Alias                | CVU                       |
|----------------------|---------------------------|
| admin.payflow.9999   | 0000003000000000000001    |
| juan.perez.1234      | 0000003000000000000002    |
| maria.gonzalez.5678  | 0000003000000000000003    |

## Notas

- Estas credenciales se generan con `npm run prisma:seed`
- Los saldos son ficticios y no representan dinero real
- Las credenciales **no se muestran en la interfaz de usuario** (login/registro)
