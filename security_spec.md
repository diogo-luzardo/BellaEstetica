# Security Specification for BellaEstética

## 1. Data Invariants
- A `cliente` must have a valid `nome` and `telefone`.
- An `agendamento` must belong to an existing `cliente` and `profissional`.
- `custos` are strictly for administrative use.
- Users can only read their own profile data (if we had a user-facing side), but since this is a management app, access is likely admin-only for now, or based on specific roles.
- For this initial version, we will assume the authenticated user (clinica owner) has full access, but we'll implement checks to ensure data integrity.

## 2. The Dirty Dozen Payloads (Targeting Rejection)

### Identity Spoofing
1. Create a `cliente` with a `userId` that doesn't match the current authenticated user (if we enforce ownership).
2. Update a `cliente`'s `createdAt` timestamp.

### Resource Poisoning
3. Send a `cliente` name that is 2MB in size.
4. Inject a document ID with 1KB of junk characters like emojis and symbols.

### State Shortcutting
5. Transition an `agendamento` from `pendente` directly to `concluido` without intermediate steps (if logic required).
6. Update the `preco` of a `procedimento` to a negative number.

### Relational Sync
7. Create an `agendamento` for a `clienteId` that doesn't exist.
8. Delete a `profissional` while they still have pending `agendamentos`.

### Schema Violation
9. Add a `emailVerified` field to a `cliente` document during creation.
10. Send a `procedimento` with a missing `preco` field.
11. Update a `custo` field `valor` with a string instead of a number.

### PII Leak
12. Attempt to list all `clientes` without being authenticated.

## 3. Test Runner
(See firestore.rules.test.ts for implementation details - normally this would be run in an emulator environment).
