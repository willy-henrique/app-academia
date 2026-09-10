# Web resiliente — sem PWA

## Decisão de produto

O WillTreino é entregue como uma aplicação web responsiva. Ele não é instalável, não publica manifest e não registra service worker. Portanto não há modo `standalone`, prompt de instalação ou cache de app shell.

O arquivo `public/sw.js` existe somente como ponte de aposentadoria: uma aba que tenha instalado/registrado uma versão anterior atualiza esse worker, ele se desregistra e não intercepta requisição alguma. Se uma aba antiga permanecer em branco, o procedimento único é DevTools → Application → Service Workers → **Unregister** e `Ctrl+Shift+R`.

## Resiliência no navegador

Persistir temporariamente uma sessão de treino e uma fila de eventos no armazenamento do navegador continua sendo um recurso de web resiliente, não PWA. A sessão ativa é persistida a cada série; em falha transitória a série recebe um id determinístico, entra na fila local e é reenviada no evento `online`. O merge dá prioridade ao servidor quando o mesmo evento já foi confirmado, sem duplicar ou sobrescrever séries.

O caminho de grupo aplica a mesma regra apenas às séries da própria pessoa. Nenhum cache de páginas, dados de Auth, Firestore, Storage ou Functions é criado pelo navegador através de service worker.
