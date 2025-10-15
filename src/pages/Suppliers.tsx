import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Phone, Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
    
    const { error } = await supabase.from("suppliers").insert([formData]);
    
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Suppliers</h1>
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
