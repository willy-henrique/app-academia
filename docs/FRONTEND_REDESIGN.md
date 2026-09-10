# Frontend Redesign

## Direção

WillTreino adota uma linguagem de **performance clara**: superfícies profundas, verde elétrico como ação principal, sinal amarelo para tempo/atenção e tipografia editorial compacta. O resultado deve parecer um produto de treino, não um dashboard administrativo ou template SaaS genérico.

## Princípios

- A próxima ação importante recebe maior contraste e espaço visual.
- Informação de treino é escaneável em poucos segundos, principalmente a 375 px.
- Estados de sincronização, descanso, participação em grupo e privacidade têm texto explícito; cor nunca é o único sinal.
- Componentes partilham tokens semânticos. Não adicionar HEX ou sombras locais para contornar o sistema.
- Movimento é apenas decorativo e continua desabilitável com `prefers-reduced-motion`.
- Controles inválidos para o estado atual não aparecem. O frontend não oferece ações que o servidor ou as Rules irão rejeitar.

## Lote UX.1

Implementado em 2026-09-09:

- Home pública reconstruída como apresentação do produto, com CTAs reais para cadastro/login e âncora funcional para explicação.
- Tokens, cards, botões, navegação desktop/mobile, páginas de autenticação e shell autenticado atualizados para a mesma direção visual.
- Dashboard semanal, treino solo, cardio, onboarding, conta e lobby de grupo passaram a usar cabeçalhos de contexto, superfícies e hierarquia compartilhadas.
- O lobby não mostra mais `Estou pronto` fora do lobby nem configuração/início fora do estado permitido; conclusão e saída recebem rótulos operacionais claros.
- Acessibilidade preservada: contraste auditado automaticamente, foco visível, targets de 44 px e suporte a movimento reduzido.

## Critério de novas telas

Uma nova tela deve começar em 375 px, possuir `main#main-content`, título hierárquico, estado de carregamento/erro acessível e usar `Card`, `Button`, `Input` e tokens do sistema quando aplicável. Telas de treino ou grupo precisam mostrar somente as ações autorizadas pelo estado persistido.
