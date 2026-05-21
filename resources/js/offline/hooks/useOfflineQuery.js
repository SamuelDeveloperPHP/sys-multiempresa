// resources/js/offline/hooks/useOfflineQuery.js
// -----------------------------------------------------------------------------
// Wrapper conveniente sobre useLiveQuery do Dexie.
// Use para queries que devem re-renderizar automaticamente quando a tabela mudar.
//
// Exemplo:
//   const veiculos = useOfflineQuery(() => db.veiculos.toArray(), [], []);
//   const filtrados = useOfflineQuery(
//       () => db.veiculos.where('prefixo').startsWithIgnoreCase(q).limit(15).toArray(),
//       [q],
//       []
//   );
// -----------------------------------------------------------------------------

import { useLiveQuery } from 'dexie-react-hooks';

export default function useOfflineQuery(queryFn, deps = [], defaultValue = null) {
    return useLiveQuery(queryFn, deps, defaultValue);
}
