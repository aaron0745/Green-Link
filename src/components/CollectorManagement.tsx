import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CollectorManagementProps {
  editingCollector?: any;
  onClose?: () => void;
}

export function CollectorManagement({ editingCollector, onClose }: CollectorManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editingCollector) {
      setIsOpen(true);
    }
  }, [editingCollector]);

  const handleOpenChange = (val: boolean) => {
    setIsOpen(val);
    if (!val && onClose) onClose();
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCollector(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      setIsOpen(false);
      toast({ title: "Success", description: "Collector added to database." });
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string, data: any }) => api.updateCollector(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      setIsOpen(false);
      if (onClose) onClose();
      toast({ title: "Success", description: "Collector updated successfully." });
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Parse wards string "1, 2" into array [1, 2]
    const wardString = formData.get('wards') as string;
    const wardArray = wardString.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

    const data: any = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      ward: wardArray,
      status: editingCollector?.status || 'active',
      avatar: (formData.get('name') as string).substring(0, 2).toUpperCase()
    };

    const password = formData.get('password') as string;
    if (password) {
      data.password = password;
    }

    if (editingCollector) {
      updateMutation.mutate({ id: editingCollector.$id, data });
    } else {
      data.totalCollections = 0;
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!editingCollector && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Collector
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCollector ? 'Edit Collector' : 'Add New Collector'}</DialogTitle>
          <DialogDescription>
            {editingCollector 
              ? `Update details for ${editingCollector.name}.` 
              : "Register a new worker. You will set their initial login password here."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" defaultValue={editingCollector?.name} placeholder="e.g. Rahul K." required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" defaultValue={editingCollector?.email} placeholder="e.g. rahul@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" name="phone" defaultValue={editingCollector?.phone} placeholder="e.g. 98470XXXXX" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Login Password {editingCollector && "(Leave blank to keep current)"}</Label>
            <Input id="password" name="password" type="password" placeholder={editingCollector ? "••••••••" : "Set initial password"} required={!editingCollector} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wards">Assigned Wards (Comma separated)</Label>
            <Input id="wards" name="wards" defaultValue={editingCollector?.ward?.join(', ')} placeholder="e.g. 1, 2, 5" required />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCollector ? 'Update Collector' : 'Create & Invite Collector'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
