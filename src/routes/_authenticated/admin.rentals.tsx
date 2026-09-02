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
      { title: "Administrar Reservas — Elegance Rent" },
      { name: "description", content: "Gestiona las reservas de clientes de Elegance Rent." },
    ],
  }),
  component: AdminRentalsPage,
});

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  active: "Activa",
  completed: "Completada",
  cancelled: "Cancelada",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
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
      toast.success("Estado actualizado");
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

  if (isLoading) return <div className="p-12 text-center">Cargando...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reservas</h1>
      <p className="mt-2 text-muted-foreground">Gestiona las solicitudes de alquiler de tus clientes.</p>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Traje</TableHead>
              <TableHead>Talla</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rentals.map((rental) => (
              <TableRow key={rental.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{rental.customer_name}</div>
                  <div className="text-sm text-muted-foreground">{rental.customer_email}</div>
                </TableCell>
                <TableCell>{(rental.suits as { name: string } | null)?.name ?? "N/A"}</TableCell>
                <TableCell>{(rental.sizes as { name: string } | null)?.name ?? "N/A"}</TableCell>
                <TableCell>
                  {format(new Date(rental.start_date), "d MMM yyyy", { locale: es })} —{" "}
                  {format(new Date(rental.end_date), "d MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[rental.status] ?? "bg-gray-100 text-gray-800"}>
                    {statusLabels[rental.status] ?? rental.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Select value={rental.status} onValueChange={(v) => handleStatusChange(rental.id, v)}>
                      <SelectTrigger className="w-32">
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
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(rental.id)}>
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
        <div className="mt-12 rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">Aún no hay reservas.</p>
        </div>
      )}
    </div>
  );
}
