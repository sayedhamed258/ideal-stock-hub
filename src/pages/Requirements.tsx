import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const requirementSchema = z.object({
  product_id: z.string().uuid("Invalid product selected"),
  needed_qty: z.number().int("Quantity must be a whole number").positive("Quantity must be greater than 0"),
  priority: z.enum(["High", "Medium", "Low"], { errorMap: () => ({ message: "Invalid priority level" }) }),
  status: z.enum(["Open", "Ordered", "Received", "Closed"], { errorMap: () => ({ message: "Invalid status" }) }),
  notes: z.string().trim().max(500, "Notes too long").default("")
});

interface Requirement {
  id: string;
  needed_qty: number;
  requested_date: string;
  priority: string;
  status: string;
  notes: string;
  products: { name: string; product_id: string; stock_qty: number };
}

export default function Requirements() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    needed_qty: 0,
    priority: "Medium",
    notes: "",
  });

  useEffect(() => {
    loadRequirements();
    loadProducts();
  }, []);

  const loadRequirements = async () => {
    const { data, error } = await supabase
      .from("requirements")
      .select(`
        *,
        products (name, product_id, stock_qty)
      `)
      .order("requested_date", { ascending: false });
    
    if (error) {
      toast.error("Error loading requirements");
      return;
    }
    setRequirements(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, product_id").order("name");
    setProducts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = requirementSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    const { error } = await supabase.from("requirements").insert([result.data as any]);
    
    if (error) {
      toast.error("Error adding requirement");
      return;
    }
    
    toast.success("Requirement added successfully!");
    setIsDialogOpen(false);
    loadRequirements();
    resetForm();
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const statusResult = z.enum(["Open", "Ordered", "Received", "Closed"]).safeParse(newStatus);
    if (!statusResult.success) {
      toast.error("Invalid status value");
      return;
    }
    
    const { error } = await supabase
      .from("requirements")
      .update({ status: statusResult.data })
      .eq("id", id);
    
    if (error) {
      toast.error("Error updating status");
      return;
    }
    
    toast.success("Status updated!");
    loadRequirements();
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      needed_qty: 0,
      priority: "Medium",
      notes: "",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive/10 text-destructive";
      case "Medium": return "bg-warning/10 text-warning";
      case "Low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-primary/10 text-primary";
      case "Ordered": return "bg-accent/10 text-accent";
      case "Received": return "bg-success/10 text-success";
      case "Closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Requirements</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Requirement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Requirement</DialogTitle>
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
                  <Label>Needed Quantity *</Label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={formData.needed_qty}
                    onChange={(e) => setFormData({ ...formData, needed_qty: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Priority *</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Add Requirement</Button>
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
                  <th className="text-left p-4 font-semibold">Current Stock</th>
                  <th className="text-left p-4 font-semibold">Needed Qty</th>
                  <th className="text-left p-4 font-semibold">Priority</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => (
                  <tr key={req.id} className="border-t hover:bg-muted/30">
                    <td className="p-4">{format(new Date(req.requested_date), "MMM dd, yyyy")}</td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{req.products?.name}</div>
                        <div className="text-xs text-muted-foreground">{req.products?.product_id}</div>
                      </div>
                    </td>
                    <td className="p-4">{req.products?.stock_qty}</td>
                    <td className="p-4 font-semibold">{req.needed_qty}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Select value={req.status} onValueChange={(v) => updateStatus(req.id, v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Ordered">Ordered</SelectItem>
                          <SelectItem value="Received">Received</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
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
