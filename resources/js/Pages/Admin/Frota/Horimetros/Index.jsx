import MedidorPanel from '@/Components/Frota/MedidorPanel';

/** Painel de Horímetros (resumo por veículo + inconsistências). */
export default function HorimetrosIndex(props) {
  return (
    <MedidorPanel
      {...props}
      titulo="Horímetros"
      routeIndex="admin.frota.horimetros.index"
      routeDestroy="admin.frota.horimetros.destroy"
    />
  );
}
