// @ts-nocheck
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStaff, deleteStaff } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/dashboard/team")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/access" });
  },
  component: TeamPage,
});

function TeamPage() {
  const list = useServerFn(listStaff);
  const del = useServerFn(deleteStaff);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["staff"], queryFn: () => list() });

  const remove = useMutation({
    mutationFn: (userId) => del({ data: { userId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); toast.success("Account removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted-foreground text-sm">
          {data ? `${data.staff.length} staff account${data.staff.length === 1 ? "" : "s"}` : "Loading…"}
        </p>
      </header>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-[140px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4}>Loading…</TableCell></TableRow>}
            {data?.staff.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.username}</TableCell>
                <TableCell><Badge variant="secondary">{p.role}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {p.username}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes their access and deletes their authentication credentials.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(p.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
            {data && data.staff.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No staff yet — create a registration code to invite someone.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
