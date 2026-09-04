import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listRentals, updateRentalStatus, deleteRental } from "@/lib/rentals.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/rentals")({
  head: () => ({
    meta: [
      { title: "Administrar Reservas — La Casa del Disfraz" },
      { name: "description", content: "Gestiona las reservas y alquileres de clientes." },
    ],
  }),
  component: AdminRentalsPage,
});

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  active: "En Alquiler (Activa)",
  completed: "Completada / Devuelta",
  cancelled: "Cancelada",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  active: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
  completed: "bg-slate-100 text-slate-700 border-slate-300",
  cancelled: "bg-rose-100 text-rose-800 border-rose-300",
};

function AdminRentalsPage() {
  const queryClient = useQueryClient();
  const fetchRentals = useServerFn(listRentals);
  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["admin-rentals"],
    queryFn: fetchRentals,
  });
  const updateStatusFn = useServerFn(updateRentalStatus);
  const deleteRentalFn = useServerFn(deleteRental);

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateStatusFn({ data: { id, status } });
      queryClient.invalidateQueries({ queryKey: ["admin-rentals"] });
      toast.success("Estado de la reserva actualizado");
    } catch (err) {
      toast.error("Error al actualizar el estado");
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta reserva?")) return;
    try {
      await deleteRentalFn({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["admin-rentals"] });
      toast.success("Reserva eliminada");
    } catch (err) {
      toast.error("Error al eliminar");
      console.error(err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          Cargando reservas...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-300/60 text-emerald-800 text-xs font-bold mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Control de Alquileres
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Reservas & Solicitudes de Clientes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Administra el flujo de alquileres, entregas, estados y devoluciones.
            </p>
          </div>

          <Link
            to="/admin"
            className="inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 text-xs font-bold transition-all self-start sm:self-auto"
          >
            ← Volver al Panel
          </Link>
        </div>

        {/* TABLA DE RESERVAS */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <Table>
            <TableHeader className="bg-slate-900 text-white">
              <TableRow className="hover:bg-slate-900 border-b border-slate-800">
                <TableHead className="text-white font-extrabold text-xs uppercase tracking-wider py-3.5">Cliente</TableHead>
                <TableHead className="text-white font-extrabold text-xs uppercase tracking-wider py-3.5">Traje / Prenda</TableHead>
                <TableHead className="text-white font-extrabold text-xs uppercase tracking-wider py-3.5">Talla</TableHead>
                <TableHead className="text-white font-extrabold text-xs uppercase tracking-wider py-3.5">Fechas de Alquiler</TableHead>
                <TableHead className="text-white font-extrabold text-xs uppercase tracking-wider py-3.5">Estado</TableHead>
                <TableHead className="text-right text-white font-extrabold text-xs uppercase tracking-wider py-3.5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {rentals.map((rental) => (
                <TableRow key={rental.id} className="hover:bg-emerald-50/50 transition-colors">
                  <TableCell className="py-3.5">
                    <div className="font-bold text-slate-900 text-xs">{rental.customer_name}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{rental.customer_email || rental.customer_phone || "Sin contacto"}</div>
                  </TableCell>
                  <TableCell className="py-3.5 font-bold text-slate-800 text-xs">
                    {(rental.suits as { name: string } | null)?.name ?? "N/A"}
                  </TableCell>
                  <TableCell className="py-3.5 text-xs font-bold">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {(rental.sizes as { name: string } | null)?.name ?? "N/A"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 text-xs font-semibold text-slate-700">
                    {format(new Date(rental.start_date), "d MMM yyyy", { locale: es })} —{" "}
                    {format(new Date(rental.end_date), "d MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge className={`rounded-lg border px-2.5 py-0.5 text-xs shadow-none ${statusColors[rental.status] ?? "bg-slate-100 text-slate-800"}`}>
                      {statusLabels[rental.status] ?? rental.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Select value={rental.status} onValueChange={(v) => handleStatusChange(rental.id, v)}>
                        <SelectTrigger className="w-36 h-8 rounded-xl border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rental.id)}
                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {rentals.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <p className="text-sm font-bold text-slate-700">Aún no hay reservas registradas.</p>
            <p className="mt-1 text-xs text-slate-500">Las solicitudes hechas por clientes aparecerán aquí automáticamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
