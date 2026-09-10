# ADR-002 — Firebase Auth e WillTreino ID separado

- **Status:** Aceita
- **Decisão:** Firebase Auth é a fonte de identidade; o UID é interno. Um `publicUserId` aleatório, não sequencial e gerado no servidor é o identificador compartilhável.
- **Contexto:** UID não é uma interface pública e uma query global de identificadores facilita enumeração.
- **Consequências:** Resolver ID e índice privado dependem de Function, App Check, rate limit e retorno mínimo.
