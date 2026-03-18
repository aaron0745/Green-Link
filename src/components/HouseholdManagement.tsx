import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Search, Banknote, Mail, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function HouseholdManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<any>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: households, isLoading } = useQuery({
    queryKey: ['households'],
    queryFn: () => api.getHouseholds()
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createHousehold(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      setIsOpen(false);
      toast({ title: "Success", description: "Household created successfully." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Creation Failed", description: error.message });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string, data: any }) => api.updateHousehold(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      setIsOpen(false);
      setEditingHouse(null);
      toast({ title: "Success", description: "Household updated successfully." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteHousehold(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      toast({ title: "Success", description: "Household deleted successfully." });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      residentName: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      ward: parseInt(formData.get('ward') as string),
      paymentStatus: editingHouse ? (formData.get('paymentStatus') as string || 'pending') : 'pending',
      monthlyFee: 100.0,
      collectionStatus: 'pending', // default
      lat: 10.85, // default placeholders
      lng: 76.27
    };

    if (editingHouse) {
      updateMutation.mutate({ id: editingHouse.$id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredHouses = (households || []).filter(h => 
    h.residentName.toLowerCase().includes(search.toLowerCase()) || 
    h.address.toLowerCase().includes(search.toLowerCase()) ||
    (h.email && h.email.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search residents..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val);
            if(!val) setEditingHouse(null);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Household
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHouse ? 'Edit Household' : 'Add New Household'}</DialogTitle>
              <DialogDescription>
                Enter the details of the resident and their location.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" defaultValue={editingHouse?.residentName} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editingHouse?.email} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">Password</Label>
                <Input id="password" name="password" type="password" defaultValue={editingHouse?.password} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Address</Label>
                <Input id="address" name="address" defaultValue={editingHouse?.address} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" name="phone" defaultValue={editingHouse?.phone} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ward" className="text-right">Ward</Label>
                <Input id="ward" name="ward" type="number" defaultValue={editingHouse?.ward} className="col-span-3" required />
              </div>
              {editingHouse && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paymentStatus" className="text-right">Payment</Label>
                  <div className="col-span-3">
                    <Select name="paymentStatus" defaultValue={editingHouse?.paymentStatus || 'pending'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingHouse ? 'Update' : 'Create'} Household
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Resident</TableHead>
                <TableHead className="font-semibold">Details</TableHead>
                <TableHead className="font-semibold text-center">Ward</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHouses.map((house) => (
                <TableRow key={house.$id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{house.residentName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{house.$id.substring(0,8)}...</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3 w-3" /> {house.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {house.address}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="rounded-md">W{house.ward}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => {
                              setEditingHouse(house);
                              setIsOpen(true);
                          }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Resident Record?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove {house.residentName} from the ward {house.ward} database.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(house.$id)} className="bg-destructive text-destructive-foreground rounded-xl">
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-border">
          {filteredHouses.map((house) => (
            <div key={house.$id} className="p-4 space-y-3 bg-card">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground leading-none">{house.residentName}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono">ID: {house.$id.substring(0,8)}</p>
                </div>
                <Badge variant="secondary" className="rounded-md">Ward {house.ward}</Badge>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{house.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-1">{house.address}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-9 rounded-xl border-primary/20 text-primary bg-primary/5 gap-2"
                  onClick={() => {
                    setEditingHouse(house);
                    setIsOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl border-destructive/20 text-destructive bg-destructive/5 gap-2">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2rem] w-[90vw] max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete record for {house.residentName}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2">
                      <AlertDialogCancel className="flex-1 mt-0 rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(house.$id)} className="flex-1 bg-destructive text-white rounded-xl">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        {filteredHouses.length === 0 && (
          <div className="text-center py-12 px-4 space-y-2">
            <Search className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground italic">No residents found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
