import MedidorPanel from '@/Components/Frota/MedidorPanel';

/** Painel de Hodômetros / Quilometragem (resumo por veículo + inconsistências). */
export default function QuilometragemIndex(props) {
  return (
    <MedidorPanel
      {...props}
      titulo="Hodômetros"
      routeIndex="admin.frota.quilometragem.index"
      routeDestroy="admin.frota.quilometragem.destroy"
    />
  );
}
