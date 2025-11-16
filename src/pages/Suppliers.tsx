import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Phone, Mail, MessageSquare, Edit, Trash2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { CsvImport } from "@/components/CsvImport";
import { CsvExport } from "@/components/CsvExport";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import DOMPurify from "dompurify";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(200, "Name too long"),
  phone: z.string().trim().max(20, "Phone number too long").default(""),
  email: z.string().trim().email("Invalid email address").max(100, "Email too long").or(z.literal("")),
  address: z.string().trim().max(300, "Address too long").default(""),
  city: z.string().trim().max(100, "City name too long").default(""),
  notes: z.string().trim().max(1000, "Notes too long").default("")
});

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
}

export default function Suppliers() {
  const { canWrite, canDelete } = useUserRole();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes: "",
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Error loading suppliers");
      return;
    }
    setSuppliers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = supplierSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    const { error } = await supabase.from("suppliers").insert([result.data as any]);
    
    if (error) {
      toast.error("Error adding supplier");
      return;
    }
    
    toast.success("Supplier added successfully!");
    setIsDialogOpen(false);
    loadSuppliers();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      notes: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete suppliers");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    
    if (error) {
      toast.error("Error deleting supplier");
      return;
    }
    
    toast.success("Supplier deleted successfully!");
    loadSuppliers();
  };

  const handleImport = async (data: any[]) => {
    if (!canWrite) {
      toast.error("You don't have permission to import suppliers");
      return;
    }

    const validSuppliers = [];
    const errors = [];

    for (const [index, row] of data.entries()) {
      const supplier = {
        name: DOMPurify.sanitize(row.name || row.supplier_name || ""),
        phone: DOMPurify.sanitize(row.phone || row.phone_number || ""),
        email: DOMPurify.sanitize(row.email || ""),
        address: DOMPurify.sanitize(row.address || ""),
        city: DOMPurify.sanitize(row.city || ""),
        notes: DOMPurify.sanitize(row.notes || "")
      };

      const result = supplierSchema.safeParse(supplier);
      if (result.success) {
        validSuppliers.push(result.data);
      } else {
        errors.push(`Row ${index + 1}: ${result.error.errors[0].message}`);
      }
    }

    if (validSuppliers.length === 0) {
      toast.error(errors.length > 0 ? `Import failed. First error: ${errors[0]}` : "No valid suppliers found");
      return;
    }

    const { error } = await supabase.from("suppliers").insert(validSuppliers as any);
    
    if (error) {
      if (error.code === '42501') {
        toast.error("You do not have permission to import suppliers");
      } else {
        toast.error("Error importing suppliers");
      }
      return;
    }

    const message = errors.length > 0 
      ? `Imported ${validSuppliers.length} suppliers (${errors.length} rows skipped)`
      : `Successfully imported ${validSuppliers.length} suppliers`;
    
    toast.success(message);
    loadSuppliers();
  };

  const prepareExportData = () => {
    return suppliers.map(s => ({
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      city: s.city,
      notes: s.notes
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <div className="flex gap-2 flex-wrap">
            <CsvImport 
              onImport={handleImport} 
              disabled={!canWrite}
              acceptedFields={["name"]}
            />
            <CsvExport 
              data={prepareExportData()} 
              filename="suppliers"
            />
            {canWrite && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Supplier
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Supplier Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Add Supplier</Button>
              </form>
            </DialogContent>
          </Dialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-card p-6 rounded-lg border hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-3">{supplier.name}</h3>
              <div className="space-y-2 text-sm">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.city && (
                  <p className="text-muted-foreground">{supplier.city}</p>
                )}
              </div>
              {supplier.phone && (
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="secondary" asChild className="flex-1">
                    <a href={`tel:${supplier.phone}`}>
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </a>
                  </Button>
                  <Button size="sm" variant="secondary" asChild className="flex-1">
                    <a href={`https://wa.me/${supplier.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      WhatsApp
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
