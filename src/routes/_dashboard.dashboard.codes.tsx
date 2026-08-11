// @ts-nocheck
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { generateCode, listCodes, deleteCode } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/dashboard/codes")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/access" });
  },
  component: CodesPage,
});

function CodesPage() {
  const list = useServerFn(listCodes);
  const gen = useServerFn(generateCode);
  const del = useServerFn(deleteCode);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["codes"], queryFn: () => list() });
  const [code, setCode] = useState("");
  const [role, setRole] = useState("EMPLOYEE");

  const create = useMutation({
    mutationFn: () => gen({ data: { code: code.trim(), role } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["codes"] });
      setCode("");
      toast.success("Code created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (c) => del({ data: { code: c } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["codes"] }),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold">Registration Codes</h1>
        <p className="text-muted-foreground text-sm">Create custom codes for new admins or employees.</p>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        className="border border-border rounded-lg p-4 bg-card flex flex-wrap gap-2 items-end"
      >
        <div className="flex-1 min-w-[180px]">
          <Label htmlFor="codeInput">Code</Label>
          <Input id="codeInput" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WELCOME-2026" minLength={4} required />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={create.isPending}>Generate Code</Button>
      </form>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
            {data?.codes.map((c) => (
              <TableRow key={c.code}>
                <TableCell className="font-mono">{c.code}</TableCell>
                <TableCell><Badge variant="secondary">{c.role}</Badge></TableCell>
                <TableCell>{c.is_used ? <Badge>Used</Badge> : <Badge variant="outline">Available</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => remove.mutate(c.code)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data && data.codes.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No codes yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
