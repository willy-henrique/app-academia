/*
 * Service worker aposentado.
 *
 * O WillTreino passou a ser entregue somente como aplicação web. Este arquivo
 * permanece temporariamente para que navegadores que possuíam uma versão PWA
 * antiga atualizem o worker e removam o próprio registro, sem interceptar
 * nenhuma requisição nem manter cache.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() =>
        self.clients
          .matchAll({ type: "window" })
          .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url)))),
      ),
  );
});
