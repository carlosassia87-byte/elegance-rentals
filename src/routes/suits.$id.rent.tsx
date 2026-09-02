import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { getSuit } from "@/lib/suits.functions";
import { createRental } from "@/lib/rentals.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/suits/$id/rent")({
  head: () => ({
    meta: [
      { title: "Reservar Traje — Elegance Rent" },
      { name: "description", content: "Completa tu solicitud de reserva de traje." },
    ],
  }),
  component: RentPage,
});

function RentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchSuit = useServerFn(getSuit);
  const { data: suit, isLoading } = useQuery({
    queryKey: ["suit", id],
    queryFn: () => fetchSuit({ data: { id } }),
  });
  const createRentalFn = useServerFn(createRental);

  const [form, setForm] = useState({
    suit_size_id: "",
    size_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    notes: "",
  });

  if (isLoading) return <div className="p-12 text-center">Cargando...</div>;
  if (!suit) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Traje no encontrado</h1>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const sizes = (suit.suit_sizes as { id: string; size_id: string; stock: number; sizes: { name: string } }[] | undefined) ?? [];

  function handleSizeChange(value: string) {
    const size = sizes.find((s) => s.id === value);
    setForm((f) => ({ ...f, suit_size_id: value, size_id: size?.size_id ?? "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.suit_size_id) {
      toast.error("Completa todas las fechas y la talla");
      return;
    }

    try {
      await createRentalFn({
        data: {
          suit_id: id,
          suit_size_id: form.suit_size_id,
          size_id: form.size_id,
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          start_date: format(form.startDate, "yyyy-MM-dd"),
          end_date: format(form.endDate, "yyyy-MM-dd"),
          notes: form.notes,
        },
      });
      toast.success("Reserva solicitada. Te contactaremos pronto.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Error al enviar la reserva");
      console.error(err);
    }
  }

  const totalDays = form.startDate && form.endDate ? Math.max(1, (form.endDate.getTime() - form.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1) : 0;
  const totalPrice = totalDays * suit.price_per_day;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/suits/$id" params={{ id }} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al traje
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">Reservar {suit.name}</h1>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tus datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input type="email" value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Talla</Label>
              <Select value={form.suit_size_id} onValueChange={handleSizeChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar talla" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.sizes.name} (stock {s.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fechas de alquiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Calendar
                mode="single"
                selected={form.startDate}
                onSelect={(date) => setForm((f) => ({ ...f, startDate: date, endDate: date ? addDays(date, 1) : undefined }))}
                disabled={{ before: new Date() }}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de devolución</Label>
              <Calendar
                mode="single"
                selected={form.endDate}
                onSelect={(date) => setForm((f) => ({ ...f, endDate: date }))}
                disabled={{ before: form.startDate ?? new Date() }}
              />
            </div>
            {totalDays > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  {totalDays} día{totalDays > 1 ? "s" : ""} × ${suit.price_per_day.toLocaleString()}
                </p>
                <p className="mt-1 text-xl font-semibold text-foreground">Total: ${totalPrice.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Button type="submit" size="lg" className="w-full">
            <CalendarDays className="mr-2 h-5 w-5" /> Enviar solicitud de reserva
          </Button>
        </div>
      </form>
    </div>
  );
}
