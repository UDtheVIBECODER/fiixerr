// @ts-nocheck
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listCatalog,
  upsertBrand,
  deleteBrand,
  upsertModel,
  deleteModel,
  upsertService,
  deleteService,
  upsertPricing,
} from "@/lib/catalog.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/dashboard/catalog")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/access" });
  },
  component: CatalogPage,
});

function CatalogPage() {
  const list = useServerFn(listCatalog);
  const { data, isLoading } = useQuery({ queryKey: ["catalog"], queryFn: () => list() });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-10 max-w-6xl">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Catalog & Pricing</h1>
        <p className="text-muted-foreground text-sm">Manage brands, models, services, and the pricing matrix.</p>
      </header>
      <BrandsSection brands={data.brands} />
      <ModelsSection models={data.models} brands={data.brands} />
      <ServicesSection services={data.services} />
      <PricingSection pricing={data.pricing} models={data.models} services={data.services} />
    </div>
  );
}

function useInvalidateCatalog() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["catalog"] });
}

function BrandsSection({ brands }) {
  const upsert = useServerFn(upsertBrand);
  const del = useServerFn(deleteBrand);
  const invalidate = useInvalidateCatalog();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");

  const save = useMutation({
    mutationFn: (vars) => upsert({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: (id) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Brands</h2>
      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Icon</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Icon URL</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((b) => (
              <BrandRow key={b.id} brand={b} onSave={(d) => save.mutate(d)} onDelete={() => remove.mutate(b.id)} />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap gap-2 items-end border border-border rounded-lg p-4 bg-card">
        <div className="flex-1 min-w-[140px]">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="OnePlus" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="oneplus" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label>Icon URL</Label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="https://…" />
        </div>
        <Button
          onClick={() => {
            save.mutate({ name, slug, icon_url: icon || null, sort_order: brands.length });
            setName(""); setSlug(""); setIcon("");
          }}
          disabled={!name || !slug}
        >
          <Plus className="h-4 w-4" /> Add brand
        </Button>
      </div>
    </section>
  );
}

function BrandRow({ brand, onSave, onDelete }) {
  const [name, setName] = useState(brand.name);
  const [slug, setSlug] = useState(brand.slug);
  const [icon, setIcon] = useState(brand.icon_url ?? "");
  const dirty = name !== brand.name || slug !== brand.slug || icon !== (brand.icon_url ?? "");

  return (
    <TableRow>
      <TableCell>
        {icon ? <img src={icon} alt="" className="h-8 w-8 object-contain" /> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell><Input value={name} onChange={(e) => setName(e.target.value)} /></TableCell>
      <TableCell><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></TableCell>
      <TableCell><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="https://…" /></TableCell>
      <TableCell>
        <div className="flex gap-1">
          {dirty && (
            <Button size="sm" onClick={() => onSave({ id: brand.id, name, slug, icon_url: icon || null, sort_order: brand.sort_order })}>
              Save
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ModelsSection({ models, brands }) {
  const upsert = useServerFn(upsertModel);
  const del = useServerFn(deleteModel);
  const invalidate = useInvalidateCatalog();
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [name, setName] = useState("");
  const save = useMutation({ mutationFn: (v) => upsert({ data: v }), onSuccess: () => { invalidate(); toast.success("Saved"); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  const remove = useMutation({ mutationFn: (id) => del({ data: { id } }), onSuccess: invalidate });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Models</h2>
      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Brand</TableHead><TableHead>Model</TableHead><TableHead className="w-[120px]"></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m) => {
              const brand = brands.find((b) => b.id === m.brand_id);
              return (
                <ModelRow key={m.id} model={m} brandName={brand?.name ?? "—"} onSave={(d) => save.mutate(d)} onDelete={() => remove.mutate(m.id)} />
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap gap-2 items-end border border-border rounded-lg p-4 bg-card">
        <div>
          <Label>Brand</Label>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label>Model name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="iPhone 16 Pro" />
        </div>
        <Button onClick={() => { save.mutate({ brand_id: brandId, name, sort_order: models.length }); setName(""); }} disabled={!brandId || !name}>
          <Plus className="h-4 w-4" /> Add model
        </Button>
      </div>
    </section>
  );
}

function ModelRow({ model, brandName, onSave, onDelete }) {
  const [name, setName] = useState(model.name);
  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground">{brandName}</TableCell>
      <TableCell><Input value={name} onChange={(e) => setName(e.target.value)} /></TableCell>
      <TableCell>
        <div className="flex gap-1">
          {name !== model.name && <Button size="sm" onClick={() => onSave({ id: model.id, brand_id: model.brand_id, name, sort_order: model.sort_order })}>Save</Button>}
          <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ServicesSection({ services }) {
  const upsert = useServerFn(upsertService);
  const del = useServerFn(deleteService);
  const invalidate = useInvalidateCatalog();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fee, setFee] = useState("");
  const save = useMutation({ mutationFn: (v) => upsert({ data: v }), onSuccess: () => { invalidate(); toast.success("Saved"); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  const remove = useMutation({ mutationFn: (id) => del({ data: { id } }), onSuccess: invalidate });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Repair Services</h2>
      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Default labor fee</TableHead><TableHead className="w-[120px]"></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <ServiceRow key={s.id} svc={s} onSave={(d) => save.mutate(d)} onDelete={() => remove.mutate(s.id)} />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap gap-2 items-end border border-border rounded-lg p-4 bg-card">
        <div className="flex-1 min-w-[140px]"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex-1 min-w-[140px]"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
        <div><Label>Labor fee</Label><Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
        <Button onClick={() => { save.mutate({ name, slug, default_labor_fee: Number(fee || 0), sort_order: services.length }); setName(""); setSlug(""); setFee(""); }} disabled={!name || !slug}>
          <Plus className="h-4 w-4" /> Add service
        </Button>
      </div>
    </section>
  );
}

function ServiceRow({ svc, onSave, onDelete }) {
  const [name, setName] = useState(svc.name);
  const [fee, setFee] = useState(String(svc.default_labor_fee));
  const dirty = name !== svc.name || fee !== String(svc.default_labor_fee);
  return (
    <TableRow>
      <TableCell><Input value={name} onChange={(e) => setName(e.target.value)} /></TableCell>
      <TableCell className="text-sm text-muted-foreground">{svc.slug}</TableCell>
      <TableCell><Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></TableCell>
      <TableCell>
        <div className="flex gap-1">
          {dirty && <Button size="sm" onClick={() => onSave({ id: svc.id, name, slug: svc.slug, default_labor_fee: Number(fee), sort_order: svc.sort_order })}>Save</Button>}
          <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PricingSection({ pricing, models, services }) {
  const upsert = useServerFn(upsertPricing);
  const invalidate = useInvalidateCatalog();
  const save = useMutation({ mutationFn: (v) => upsert({ data: v }), onSuccess: () => { invalidate(); toast.success("Saved"); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });

  function getCell(modelId, serviceId) {
    return pricing.find((p) => p.model_id === modelId && p.service_id === serviceId);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Pricing Matrix</h2>
      <p className="text-sm text-muted-foreground">Edit part cost & labor fee per model/service combination.</p>
      <div className="border border-border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              {services.map((s) => <TableHead key={s.id}>{s.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium whitespace-nowrap">{m.name}</TableCell>
                {services.map((s) => {
                  const cell = getCell(m.id, s.id);
                  return (
                    <TableCell key={s.id}>
                      <PricingCell
                        cell={cell}
                        modelId={m.id}
                        serviceId={s.id}
                        defaultLabor={s.default_labor_fee}
                        onSave={(d) => save.mutate(d)}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function PricingCell({ cell, modelId, serviceId, defaultLabor, onSave }) {
  const [part, setPart] = useState(String(cell?.part_cost ?? 0));
  const [labor, setLabor] = useState(String(cell?.labor_fee ?? defaultLabor));
  const dirty = String(cell?.part_cost ?? 0) !== part || String(cell?.labor_fee ?? defaultLabor) !== labor;

  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground w-10">Part</span>
        <Input type="number" value={part} onChange={(e) => setPart(e.target.value)} className="h-8" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground w-10">Labor</span>
        <Input type="number" value={labor} onChange={(e) => setLabor(e.target.value)} className="h-8" />
      </div>
      {dirty && (
        <Button size="sm" className="w-full h-7 text-xs" onClick={() => onSave({ id: cell?.id, model_id: modelId, service_id: serviceId, part_cost: Number(part), labor_fee: Number(labor), estimated_minutes: cell?.estimated_minutes ?? 30 })}>
          Save
        </Button>
      )}
    </div>
  );
}
