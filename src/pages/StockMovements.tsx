import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { z } from "zod";

const stockMovementSchema = z.object({
  product_id: z.string().uuid("Invalid product selected"),
  movement_type: z.enum(["IN", "OUT"], { errorMap: () => ({ message: "Movement type must be IN or OUT" }) }),
  quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be greater than 0"),
  reference: z.string().trim().max(100, "Reference too long").default(""),
  notes: z.string().trim().max(500, "Notes too long").default("")
});

interface StockMovement {
  id: string;
  movement_date: string;
  movement_type: string;
  quantity: number;
  reference: string;
  notes: string;
  products: { name: string; product_id: string };
}

export default function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    movement_type: "IN",
    quantity: 0,
    reference: "",
    notes: "",
  });

  useEffect(() => {
    loadMovements();
    loadProducts();
  }, []);

  const loadMovements = async () => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        products (name, product_id)
      `)
      .order("movement_date", { ascending: false });
    
    if (error) {
      toast.error("Error loading stock movements");
      return;
    }
    setMovements(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, product_id").order("name");
    setProducts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = stockMovementSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    const { error } = await supabase.from("stock_movements").insert([result.data as any]);
    
    if (error) {
      toast.error("Error adding stock movement");
      return;
    }
    
    toast.success("Stock movement recorded successfully!");
    setIsDialogOpen(false);
    loadMovements();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      movement_type: "IN",
      quantity: 0,
      reference: "",
      notes: "",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Stock Movements</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Movement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Stock Movement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Product *</Label>
                  <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          {prod.product_id} - {prod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Movement Type *</Label>
                  <Select value={formData.movement_type} onValueChange={(v) => setFormData({ ...formData, movement_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">IN (Stock Added)</SelectItem>
                      <SelectItem value="OUT">OUT (Stock Removed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input
                    placeholder="e.g. Invoice No., PO No."
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Record Movement</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-left p-4 font-semibold">Product</th>
                  <th className="text-left p-4 font-semibold">Type</th>
                  <th className="text-left p-4 font-semibold">Quantity</th>
                  <th className="text-left p-4 font-semibold">Reference</th>
                  <th className="text-left p-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-t hover:bg-muted/30">
                    <td className="p-4">{format(new Date(movement.movement_date), "MMM dd, yyyy HH:mm")}</td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{movement.products?.name}</div>
                        <div className="text-xs text-muted-foreground">{movement.products?.product_id}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        movement.movement_type === "IN" 
                          ? "bg-success/10 text-success" 
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {movement.movement_type === "IN" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {movement.movement_type}
                      </span>
                    </td>
                    <td className="p-4 font-semibold">{movement.quantity}</td>
                    <td className="p-4">{movement.reference || "-"}</td>
                    <td className="p-4 text-sm text-muted-foreground">{movement.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
