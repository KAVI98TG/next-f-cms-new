import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Boxes, ChevronLeft, ChevronRight, Eye, EyeOff, Filter, RotateCcw, Search, Star, Store, Waypoints, X } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, MetricCard, Modal, SectionHeader, SelectInput, TextInput, Toggle, type DataTableColumn } from "../../../shared/components";
import type { DigitalProductKind, NextFGamingOffer, NextFGamingProduct, SupplierOfferMapping } from "../types";
import { gamingVNextStore } from "../runtime/store";
import { useVNextStore } from "../runtime/useVNextStore";
import { buildGamingQuote } from "../runtime/pricingEngine";
import { chooseSupplierMapping } from "../runtime/supplierRouter";
import { flushDurableWrites, readExternalCapability, readRuntimeTruth } from "../../../services/production";
import { MediaUploadButton } from "../../media/MediaUploadButton";
import { GamingKindBadge } from "../../shared/GamingKindBadge";

const runtime = readRuntimeTruth();
const storefrontCapability = readExternalCapability("gaming.public-storefront");
const PAGE_SIZES = [50, 100, 200] as const;

type CatalogTab = "products" | "offers" | "routing";
type ProductView = "all" | "attention" | "public" | "featured" | "hidden";
type ProductOfferFilter = "all" | "none" | "few" | "medium" | "many";
type ProductRouteFilter = "all" | "routable" | "missing" | "multi";
type ProductSort = "name" | "offers_desc" | "updated_desc";
type OfferStateFilter = "all" | "public" | "hidden" | "validation" | "routable" | "unroutable";
type RouteStateFilter = "all" | "enabled" | "disabled" | "available" | "attention" | "primary";

const lkr = (value?: number) => value == null ? "Live quote" : new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(value);
const money = (value: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 4 }).format(value);
const kindLabel = (kind: string) => kind.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
const countLabel = (count: number, singular: string, plural = `${singular}s`) => `${count.toLocaleString()} ${count === 1 ? singular : plural}`;

function normalizeArtworkUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch { return undefined; }
}

function publicName(product: NextFGamingProduct) { return product.displayName?.trim() || product.name; }
function publicDescription(product: NextFGamingProduct) { return product.merchandisingDescription ?? product.shortDescription ?? ""; }
function supplierLabel(id: string) { const value = id.toLowerCase(); if (value.includes("fazer")) return "FazerCards"; return id; }
function productMatchesQuery(product: NextFGamingProduct, query: string) {
  if (!query) return true;
  return [publicName(product), product.name, product.slug, product.id, product.gameFamily, product.brand, product.kind].filter(Boolean).join(" ").toLowerCase().includes(query);
}
function offerBand(count: number, filter: ProductOfferFilter) {
  if (filter === "none") return count === 0;
  if (filter === "few") return count >= 1 && count <= 5;
  if (filter === "medium") return count >= 6 && count <= 20;
  if (filter === "many") return count > 20;
  return true;
}

export function CatalogVNextPage() {
  const products = useVNextStore(gamingVNextStore.getProducts);
  const offers = useVNextStore(gamingVNextStore.getOffers);
  const mappings = useVNextStore(gamingVNextStore.getMappings);
  const [tab, setTabState] = useState<CatalogTab>("products");
  const [selectedProduct, setSelectedProduct] = useState<NextFGamingProduct>();
  const [selectedOffer, setSelectedOffer] = useState<NextFGamingOffer>();
  const [selectedMapping, setSelectedMapping] = useState<SupplierOfferMapping>();
  const [productSaveError, setProductSaveError] = useState("");
  const [artworkPreviewFailed, setArtworkPreviewFailed] = useState(false);
  const [query, setQueryState] = useState("");
  const [kindFilter, setKindFilterState] = useState<"all" | DigitalProductKind>("all");
  const [productView, setProductViewState] = useState<ProductView>("all");
  const [productOfferFilter, setProductOfferFilterState] = useState<ProductOfferFilter>("all");
  const [productRouteFilter, setProductRouteFilterState] = useState<ProductRouteFilter>("all");
  const [productSort, setProductSortState] = useState<ProductSort>("name");
  const [offerStateFilter, setOfferStateFilterState] = useState<OfferStateFilter>("all");
  const [routeStateFilter, setRouteStateFilterState] = useState<RouteStateFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<(typeof PAGE_SIZES)[number]>(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState("");

  const offersByProduct = useMemo(() => {
    const index = new Map<string, NextFGamingOffer[]>();
    for (const offer of offers) index.set(offer.productId, [...(index.get(offer.productId) ?? []), offer]);
    return index;
  }, [offers]);
  const mappingsByOffer = useMemo(() => {
    const index = new Map<string, SupplierOfferMapping[]>();
    for (const mapping of mappings) index.set(mapping.offerId, [...(index.get(mapping.offerId) ?? []), mapping]);
    return index;
  }, [mappings]);
  const productStats = useMemo(() => {
    const stats = new Map<string, { offerCount: number; enabledOfferCount: number; routeCount: number; activeRouteCount: number; routableOfferCount: number; supplierCount: number }>();
    for (const product of products) {
      const productOffers = offersByProduct.get(product.id) ?? [];
      const productMappings = productOffers.flatMap((offer) => mappingsByOffer.get(offer.id) ?? []);
      const activeRoutes = productMappings.filter((mapping) => mapping.enabled && mapping.availability.state === "available");
      const routableOfferCount = productOffers.filter((offer) => offer.enabled && (mappingsByOffer.get(offer.id) ?? []).some((mapping) => mapping.enabled && mapping.availability.state === "available")).length;
      stats.set(product.id, {
        offerCount: productOffers.length,
        enabledOfferCount: productOffers.filter((offer) => offer.enabled).length,
        routeCount: productMappings.length,
        activeRouteCount: activeRoutes.length,
        routableOfferCount,
        supplierCount: new Set(productMappings.map((mapping) => mapping.supplierId)).size,
      });
    }
    return stats;
  }, [mappingsByOffer, offersByProduct, products]);

  const activeMappings = mappings.filter((mapping) => mapping.enabled && mapping.availability.state === "available");
  const estimated = useMemo(() => offers.filter((offer) => offer.enabled).map((offer) => {
    const mapping = chooseSupplierMapping(offer, mappings);
    return mapping ? buildGamingQuote({ offer, mapping, quantity: 1, requestedAmount: offer.pricingMode === "amount_based" ? offer.minAmount : undefined }) : undefined;
  }).filter(Boolean), [offers, mappings]);
  const attentionProducts = useMemo(() => products.filter((product) => {
    const stats = productStats.get(product.id);
    return product.enabled && (!stats || stats.enabledOfferCount === 0 || stats.routableOfferCount === 0);
  }), [productStats, products]);
  const kinds = useMemo(() => [...new Set([...products.map((product) => product.kind), ...offers.map((offer) => offer.kind), ...mappings.map((mapping) => mapping.supplierKind)])].sort(), [mappings, offers, products]);

  const resetListing = (clearSelection = true) => {
    setPage(1);
    setBulkMessage("");
    setBulkError("");
    if (clearSelection) setSelectedIds(new Set());
  };
  const setTab = (next: CatalogTab) => {
    setTabState(next);
    setQueryState("");
    setKindFilterState("all");
    setProductViewState("all");
    setProductOfferFilterState("all");
    setProductRouteFilterState("all");
    setOfferStateFilterState("all");
    setRouteStateFilterState("all");
    resetListing();
  };
  const setQuery = (value: string) => { setQueryState(value); resetListing(); };
  const setKindFilter = (value: "all" | DigitalProductKind) => { setKindFilterState(value); resetListing(); };
  const normalizedQuery = query.trim().toLowerCase();

  const filteredProducts = useMemo(() => products.filter((product) => {
    const stats = productStats.get(product.id) ?? { offerCount: 0, enabledOfferCount: 0, routeCount: 0, activeRouteCount: 0, routableOfferCount: 0, supplierCount: 0 };
    const needsAttention = product.enabled && (stats.enabledOfferCount === 0 || stats.routableOfferCount === 0);
    if (!productMatchesQuery(product, normalizedQuery)) return false;
    if (kindFilter !== "all" && product.kind !== kindFilter) return false;
    if (productView === "attention" && !needsAttention) return false;
    if (productView === "public" && !product.enabled) return false;
    if (productView === "featured" && !product.featured) return false;
    if (productView === "hidden" && product.enabled) return false;
    if (!offerBand(stats.offerCount, productOfferFilter)) return false;
    if (productRouteFilter === "routable" && stats.routableOfferCount === 0) return false;
    if (productRouteFilter === "missing" && stats.routableOfferCount > 0) return false;
    if (productRouteFilter === "multi" && stats.supplierCount < 2) return false;
    return true;
  }).sort((a, b) => {
    if (productSort === "offers_desc") return (productStats.get(b.id)?.offerCount ?? 0) - (productStats.get(a.id)?.offerCount ?? 0) || publicName(a).localeCompare(publicName(b));
    if (productSort === "updated_desc") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return publicName(a).localeCompare(publicName(b));
  }), [kindFilter, normalizedQuery, productOfferFilter, productRouteFilter, productSort, productStats, productView, products]);

  const filteredOffers = useMemo(() => offers.filter((offer) => {
    const product = products.find((row) => row.id === offer.productId);
    const offerMappings = mappingsByOffer.get(offer.id) ?? [];
    const routable = offerMappings.some((mapping) => mapping.enabled && mapping.availability.state === "available");
    const haystack = `${offer.name} ${offer.id} ${offer.kind} ${product ? `${publicName(product)} ${product.slug} ${product.id}` : ""}`.toLowerCase();
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
    if (kindFilter !== "all" && offer.kind !== kindFilter) return false;
    if (offerStateFilter === "public" && !offer.enabled) return false;
    if (offerStateFilter === "hidden" && offer.enabled) return false;
    if (offerStateFilter === "validation" && !offer.validation.supported) return false;
    if (offerStateFilter === "routable" && !routable) return false;
    if (offerStateFilter === "unroutable" && routable) return false;
    return true;
  }).sort((a, b) => {
    const pa = products.find((row) => row.id === a.productId);
    const pb = products.find((row) => row.id === b.productId);
    return (pa ? publicName(pa) : "").localeCompare(pb ? publicName(pb) : "") || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  }), [kindFilter, mappingsByOffer, normalizedQuery, offerStateFilter, offers, products]);

  const filteredMappings = useMemo(() => mappings.filter((mapping) => {
    const offer = offers.find((row) => row.id === mapping.offerId);
    const product = products.find((row) => row.id === offer?.productId);
    const haystack = `${mapping.id} ${mapping.supplierId} ${mapping.externalOfferId ?? ""} ${mapping.externalProductId ?? ""} ${offer?.name ?? ""} ${product ? `${publicName(product)} ${product.slug}` : ""}`.toLowerCase();
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
    if (kindFilter !== "all" && mapping.supplierKind !== kindFilter) return false;
    if (routeStateFilter === "enabled" && !mapping.enabled) return false;
    if (routeStateFilter === "disabled" && mapping.enabled) return false;
    if (routeStateFilter === "available" && mapping.availability.state !== "available") return false;
    if (routeStateFilter === "attention" && mapping.enabled && mapping.availability.state === "available") return false;
    if (routeStateFilter === "primary" && mapping.priority !== 1) return false;
    return true;
  }).sort((a, b) => a.offerId.localeCompare(b.offerId) || a.priority - b.priority), [kindFilter, mappings, normalizedQuery, offers, products, routeStateFilter]);

  const currentRows = tab === "products" ? filteredProducts : tab === "offers" ? filteredOffers : filteredMappings;
  const totalPages = Math.max(1, Math.ceil(currentRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = currentRows.slice(pageStart, pageStart + pageSize);
  const visibleIds = pageRows.map((row) => row.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;
  const selectedFilteredCount = currentRows.filter((row) => selectedIds.has(row.id)).length;

  const toggleSelected = (id: string, checked: boolean) => setSelectedIds((current) => {
    const next = new Set(current);
    if (checked) next.add(id); else next.delete(id);
    return next;
  });
  const toggleVisible = (checked: boolean) => setSelectedIds((current) => {
    const next = new Set(current);
    for (const id of visibleIds) checked ? next.add(id) : next.delete(id);
    return next;
  });
  const selectAllFiltered = () => setSelectedIds(new Set(currentRows.map((row) => row.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const applyBulk = async (patch: { products?: Partial<NextFGamingProduct>; offers?: Partial<NextFGamingOffer>; mappings?: Partial<SupplierOfferMapping> }, label: string) => {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];
    setBulkBusy(true);
    setBulkMessage("");
    setBulkError("");
    try {
      if (patch.products) gamingVNextStore.updateProducts(ids, patch.products);
      if (patch.offers) gamingVNextStore.updateOffers(ids, patch.offers);
      if (patch.mappings) gamingVNextStore.updateMappings(ids, patch.mappings);
      await flushDurableWrites();
      setBulkMessage(`${label} applied to ${countLabel(ids.length, "record")}.`);
      clearSelection();
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Could not apply the bulk catalog update.");
    } finally {
      setBulkBusy(false);
    }
  };

  const selectHeader = <input type="checkbox" className="catalog-row-check" aria-label="Select visible rows" checked={allVisibleSelected} onChange={(event) => toggleVisible(event.target.checked)} />;
  const productCols: DataTableColumn<NextFGamingProduct>[] = [
    { key: "select", header: selectHeader, width: "42px", render: (product) => <input type="checkbox" className="catalog-row-check" aria-label={`Select ${publicName(product)}`} checked={selectedIds.has(product.id)} onChange={(event) => toggleSelected(product.id, event.target.checked)} /> },
    { key: "product", header: "NEXT F product", render: (product) => <div className="entity-cell catalog-entity"><strong>{publicName(product)}</strong></div> },
    { key: "kind", header: "Kind", width: "130px", render: (product) => <GamingKindBadge kind={product.kind}/> },
    { key: "offers", header: "Offers", width: "110px", render: (product) => { const stats = productStats.get(product.id); const total = stats?.offerCount ?? 0; const publicCount = stats?.enabledOfferCount ?? 0; return <div className="entity-cell"><strong>{total}</strong>{publicCount !== total ? <small>{publicCount} public</small> : null}</div>; } },
    { key: "routing", header: "Routing", width: "145px", render: (product) => { const stats = productStats.get(product.id); const routable = (stats?.routableOfferCount ?? 0) > 0; const noOffers = (stats?.offerCount ?? 0) === 0; const supplierCount = stats?.supplierCount ?? 0; return <div className="entity-cell"><Badge tone={routable ? "success" : product.enabled ? "danger" : "neutral"}>{routable ? "Routeable" : noOffers ? "No offers" : "No live route"}</Badge>{supplierCount > 1 ? <small>{supplierCount} suppliers</small> : null}</div>; } },
    { key: "featured", header: "Featured", width: "105px", render: (product) => <Toggle checked={product.featured} onChange={(featured) => gamingVNextStore.updateProduct(product.id, { featured })} /> },
    { key: "enabled", header: "Public", width: "95px", render: (product) => <Toggle checked={product.enabled} onChange={(enabled) => gamingVNextStore.updateProduct(product.id, { enabled })} /> },
    { key: "action", header: "", width: "82px", render: (product) => <Button onClick={() => { setProductSaveError(""); setArtworkPreviewFailed(false); setSelectedProduct(product); }}>Edit</Button> },
  ];
  const offerCols: DataTableColumn<NextFGamingOffer>[] = [
    { key: "select", header: selectHeader, width: "42px", render: (offer) => <input type="checkbox" className="catalog-row-check" aria-label={`Select ${offer.name}`} checked={selectedIds.has(offer.id)} onChange={(event) => toggleSelected(offer.id, event.target.checked)} /> },
    { key: "offer", header: "Retail offer", render: (offer) => { const product = products.find((row) => row.id === offer.productId); return <div className="entity-cell catalog-entity"><strong>{product ? publicName(product) : "Unknown product"} · {offer.name}</strong><small>{kindLabel(offer.kind)} · {offer.purchaseFields.length} customer fields</small></div>; } },
    { key: "price", header: "Retail price", width: "150px", render: (offer) => <div className="entity-cell"><strong>{lkr(offer.sellingPriceLkr)}</strong><small>{offer.pricingMode.replaceAll("_", " ")}</small></div> },
    { key: "validation", header: "Validation", width: "125px", render: (offer) => <Badge tone={offer.validation.supported ? "success" : "neutral"}>{offer.validation.supported ? "Preflight" : "Not required"}</Badge> },
    { key: "routes", header: "Routing", width: "145px", render: (offer) => { const offerMappings = mappingsByOffer.get(offer.id) ?? []; const active = offerMappings.filter((mapping) => mapping.enabled && mapping.availability.state === "available").length; return <div className="entity-cell"><Badge tone={active ? "success" : offer.enabled ? "danger" : "neutral"}>{active ? "Routeable" : "No live route"}</Badge>{offerMappings.length > 1 ? <small>{active} active · {offerMappings.length} routes</small> : null}</div>; } },
    { key: "enabled", header: "Public", width: "95px", render: (offer) => <Toggle checked={offer.enabled} onChange={(enabled) => gamingVNextStore.updateOffer(offer.id, { enabled })} /> },
    { key: "action", header: "", width: "82px", render: (offer) => <Button onClick={() => setSelectedOffer(offer)}>Edit</Button> },
  ];
  const mappingCols: DataTableColumn<SupplierOfferMapping>[] = [
    { key: "select", header: selectHeader, width: "42px", render: (mapping) => <input type="checkbox" className="catalog-row-check" aria-label={`Select route ${mapping.id}`} checked={selectedIds.has(mapping.id)} onChange={(event) => toggleSelected(mapping.id, event.target.checked)} /> },
    { key: "route", header: "Offer / supplier", render: (mapping) => { const offer = offers.find((row) => row.id === mapping.offerId); const product = products.find((row) => row.id === offer?.productId); return <div className="entity-cell catalog-entity"><strong>{product ? publicName(product) : "Unknown product"} · {offer?.name ?? mapping.offerId}</strong><small>{supplierLabel(mapping.supplierId)}</small></div>; } },
    { key: "priority", header: "Priority", width: "95px", render: (mapping) => <Badge tone={mapping.priority === 1 ? "info" : "neutral"}>#{mapping.priority}</Badge> },
    { key: "cost", header: "Supplier cost", width: "150px", render: (mapping) => <div className="entity-cell"><strong>{money(mapping.supplierCost, mapping.supplierCurrency)}</strong><small>{mapping.availability.stock == null ? "Live availability" : `${mapping.availability.stock} stock`}</small></div> },
    { key: "availability", header: "Availability", width: "125px", render: (mapping) => <Badge tone={mapping.availability.state === "available" ? "success" : mapping.availability.state === "unknown" ? "warning" : "danger"}>{mapping.availability.state}</Badge> },
    { key: "enabled", header: "Route", width: "95px", render: (mapping) => <Toggle checked={mapping.enabled} onChange={(enabled) => gamingVNextStore.updateMapping(mapping.id, { enabled })} /> },
    { key: "action", header: "", width: "82px", render: (mapping) => <Button onClick={() => setSelectedMapping(mapping)}>Edit</Button> },
  ];

  return <div className="page catalog-control-page">
    <SectionHeader eyebrow="Gaming Store" title="Catalog & Supplier Routing" description="Search, review and bulk-manage NEXT F products and supplier offers." action={<Button variant="primary" className={storefrontCapability.available ? "storefront-action" : "storefront-action storefront-action--unavailable"} disabled={!storefrontCapability.available} title={storefrontCapability.detail} onClick={() => storefrontCapability.href && window.open(storefrontCapability.href, "_blank", "noopener,noreferrer")}><Eye size={15}/> {storefrontCapability.available ? "Open storefront" : "Storefront unavailable"}</Button>} />
    <div className="compact-metrics"><MetricCard label="Public products" value={String(products.filter((product) => product.enabled).length)} icon={Store}/><MetricCard label="Retail offers" value={String(offers.filter((offer) => offer.enabled).length)} icon={Boxes}/><MetricCard label="Active supplier routes" value={String(activeMappings.length)} icon={Waypoints}/><MetricCard label="Quoted offers" value={String(estimated.length)} icon={ArrowUpDown}/></div>
    {runtime.isLocal&&<div className="section-actions"><Button onClick={() => { if (confirm("Reset the local catalog to its seeded state?")) gamingVNextStore.reset(); }}><RotateCcw size={14}/> Reset local catalog</Button></div>}

    <div className="segmented-nav catalog-tabs"><button className={tab === "products" ? "is-active" : ""} onClick={() => setTab("products")}>Products <span>{products.length.toLocaleString()}</span></button><button className={tab === "offers" ? "is-active" : ""} onClick={() => setTab("offers")}>Offers <span>{offers.length.toLocaleString()}</span></button><button className={tab === "routing" ? "is-active" : ""} onClick={() => setTab("routing")}>Supplier routing <span>{mappings.length.toLocaleString()}</span></button></div>

    <Card className="catalog-workspace">
      {tab === "products" && <div className="catalog-smart-views" aria-label="Product views">
        <button className={productView === "all" ? "is-active" : ""} onClick={() => { setProductViewState("all"); resetListing(); }}><Store size={14}/><span>All products</span><b>{products.length.toLocaleString()}</b></button>
        <button className={productView === "attention" ? "is-active is-warning" : ""} onClick={() => { setProductViewState("attention"); resetListing(); }}><AlertTriangle size={14}/><span>Needs attention</span><b>{attentionProducts.length.toLocaleString()}</b></button>
        <button className={productView === "public" ? "is-active" : ""} onClick={() => { setProductViewState("public"); resetListing(); }}><Eye size={14}/><span>Public</span><b>{products.filter((product) => product.enabled).length.toLocaleString()}</b></button>
        <button className={productView === "featured" ? "is-active" : ""} onClick={() => { setProductViewState("featured"); resetListing(); }}><Star size={14}/><span>Featured</span><b>{products.filter((product) => product.featured).length.toLocaleString()}</b></button>
        <button className={productView === "hidden" ? "is-active" : ""} onClick={() => { setProductViewState("hidden"); resetListing(); }}><EyeOff size={14}/><span>Hidden</span><b>{products.filter((product) => !product.enabled).length.toLocaleString()}</b></button>
      </div>}

      <div className="catalog-filter-bar">
        <label className="catalog-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "products" ? "Search product name, family, slug or ID…" : tab === "offers" ? "Search offer, product or ID…" : "Search product, supplier or external ID…"}/>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={14}/></button>}</label>
        <div className="catalog-filter-group"><Filter size={15}/><SelectInput aria-label="Product kind" value={kindFilter} onChange={(event) => setKindFilter(event.target.value as "all" | DigitalProductKind)}><option value="all">All kinds</option>{kinds.map((kind) => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}</SelectInput></div>
        {tab === "products" && <>
          <SelectInput aria-label="Offer count" value={productOfferFilter} onChange={(event) => { setProductOfferFilterState(event.target.value as ProductOfferFilter); resetListing(); }}><option value="all">Any offer count</option><option value="none">No offers</option><option value="few">1–5 offers</option><option value="medium">6–20 offers</option><option value="many">20+ offers</option></SelectInput>
          <SelectInput aria-label="Routing state" value={productRouteFilter} onChange={(event) => { setProductRouteFilterState(event.target.value as ProductRouteFilter); resetListing(); }}><option value="all">Any routing</option><option value="routable">Routeable</option><option value="missing">Missing live route</option><option value="multi">Multiple suppliers</option></SelectInput>
          <SelectInput aria-label="Sort products" value={productSort} onChange={(event) => { setProductSortState(event.target.value as ProductSort); resetListing(false); }}><option value="name">Name A–Z</option><option value="offers_desc">Most offers</option><option value="updated_desc">Recently updated</option></SelectInput>
        </>}
        {tab === "offers" && <SelectInput aria-label="Offer state" value={offerStateFilter} onChange={(event) => { setOfferStateFilterState(event.target.value as OfferStateFilter); resetListing(); }}><option value="all">Any offer state</option><option value="public">Public</option><option value="hidden">Hidden</option><option value="validation">Validation enabled</option><option value="routable">Routeable</option><option value="unroutable">No live route</option></SelectInput>}
        {tab === "routing" && <SelectInput aria-label="Route state" value={routeStateFilter} onChange={(event) => { setRouteStateFilterState(event.target.value as RouteStateFilter); resetListing(); }}><option value="all">Any route state</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option><option value="available">Available now</option><option value="attention">Needs attention</option><option value="primary">Primary priority</option></SelectInput>}
      </div>

      <div className="catalog-list-meta">
        <div><strong>{currentRows.length.toLocaleString()}</strong><span>matching {tab === "products" ? "products" : tab === "offers" ? "offers" : "routes"}</span>{(query || kindFilter !== "all" || productView !== "all" || productOfferFilter !== "all" || productRouteFilter !== "all" || offerStateFilter !== "all" || routeStateFilter !== "all") && <Button variant="ghost" className="catalog-clear-filters" onClick={() => { setQueryState(""); setKindFilterState("all"); setProductViewState("all"); setProductOfferFilterState("all"); setProductRouteFilterState("all"); setOfferStateFilterState("all"); setRouteStateFilterState("all"); resetListing(); }}>Clear filters</Button>}</div>
        <div className="catalog-page-size"><SelectInput aria-label="Rows per page" value={String(pageSize)} onChange={(event) => { setPageSizeState(Number(event.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size} rows</option>)}</SelectInput></div>
      </div>

      {selectedCount > 0 && <div className="catalog-bulk-bar">
        <div><strong>{selectedCount.toLocaleString()} selected</strong><small>{selectedFilteredCount === currentRows.length && currentRows.length > pageRows.length ? "All filtered records selected" : `${selectedFilteredCount.toLocaleString()} in current filtered result`}</small></div>
        <div className="catalog-bulk-actions">
          {selectedFilteredCount < currentRows.length && currentRows.length > pageRows.length && <Button onClick={selectAllFiltered} disabled={bulkBusy}>Select all {currentRows.length.toLocaleString()} filtered</Button>}
          {tab === "products" && <><Button onClick={() => void applyBulk({ products: { enabled: true } }, "Made public")} disabled={bulkBusy}><Eye size={14}/> Make public</Button><Button onClick={() => void applyBulk({ products: { enabled: false } }, "Hidden")} disabled={bulkBusy}><EyeOff size={14}/> Hide</Button><Button onClick={() => void applyBulk({ products: { featured: true } }, "Featured")} disabled={bulkBusy}><Star size={14}/> Feature</Button><Button onClick={() => void applyBulk({ products: { featured: false } }, "Removed from featured")} disabled={bulkBusy}>Unfeature</Button></>}
          {tab === "offers" && <><Button onClick={() => void applyBulk({ offers: { enabled: true } }, "Made public")} disabled={bulkBusy}><Eye size={14}/> Make public</Button><Button onClick={() => void applyBulk({ offers: { enabled: false } }, "Hidden")} disabled={bulkBusy}><EyeOff size={14}/> Hide</Button></>}
          {tab === "routing" && <><Button onClick={() => void applyBulk({ mappings: { enabled: true } }, "Routes enabled")} disabled={bulkBusy}>Enable routes</Button><Button onClick={() => void applyBulk({ mappings: { enabled: false } }, "Routes disabled")} disabled={bulkBusy}>Disable routes</Button></>}
          <Button variant="ghost" onClick={clearSelection} disabled={bulkBusy}>Clear</Button>
        </div>
      </div>}
      {bulkMessage && <div className="catalog-bulk-feedback is-success">{bulkMessage}</div>}
      {bulkError && <div className="catalog-bulk-feedback is-error">{bulkError}</div>}

      {tab === "products" ? <DataTable rows={pageRows as NextFGamingProduct[]} columns={productCols} getKey={(row) => row.id} empty="No products match these filters."/> : tab === "offers" ? <DataTable rows={pageRows as NextFGamingOffer[]} columns={offerCols} getKey={(row) => row.id} empty="No retail offers match these filters."/> : <DataTable rows={pageRows as SupplierOfferMapping[]} columns={mappingCols} getKey={(row) => row.id} empty="No supplier routes match these filters."/>}

      <div className="catalog-pagination">
        <span>{currentRows.length ? `${(pageStart + 1).toLocaleString()}–${Math.min(pageStart + pageSize, currentRows.length).toLocaleString()} of ${currentRows.length.toLocaleString()}` : "0 results"}</span>
        <div><Button aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15}/></Button><strong>Page {currentPage} of {totalPages}</strong><Button aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={15}/></Button></div>
      </div>
    </Card>

    <Modal
      open={!!selectedProduct}
      onClose={() => setSelectedProduct(undefined)}
      title="Edit NEXT F product"
      description="Manage storefront identity and artwork."
      className="modal--wide gaming-product-modal"
      footer={selectedProduct ? <>
        <Button onClick={() => setSelectedProduct(undefined)}>Cancel</Button>
        <Button variant="primary" onClick={async () => {
          const raw = selectedProduct.artworkUrl?.trim();
          const artworkUrl = normalizeArtworkUrl(raw);
          if (raw && !artworkUrl) {
            setProductSaveError("Artwork URL must be a valid HTTPS URL.");
            return;
          }
          setProductSaveError("");
          gamingVNextStore.updateProduct(selectedProduct.id, {
            ...selectedProduct,
            displayName: selectedProduct.displayName?.trim() || undefined,
            gameFamily: selectedProduct.gameFamily?.trim() || undefined,
            merchandisingDescription: selectedProduct.merchandisingDescription?.trim() || undefined,
            artworkUrl,
          });
          try {
            await flushDurableWrites();
            setSelectedProduct(undefined);
          } catch (error) {
            setProductSaveError(error instanceof Error ? error.message : "Could not save product merchandising.");
          }
        }}>Save product</Button>
      </> : undefined}
    >
      {selectedProduct && <div className="gaming-product-editor">
        <div className="gaming-product-editor__main">
          <section className="gaming-editor-section">
            <div className="gaming-editor-section__heading">
              <div>
                <span>Storefront identity</span>
                <strong>Customer-facing product details</strong>
              </div>
              <Badge tone={selectedProduct.enabled ? "success" : "neutral"}>{selectedProduct.enabled ? "Public" : "Hidden"}</Badge>
            </div>
            <div className="form-grid form-grid--two gaming-product-editor__fields">
              <FormField label="Public name">
                <TextInput value={selectedProduct.displayName ?? selectedProduct.name} onChange={(event) => setSelectedProduct({ ...selectedProduct, displayName: event.target.value })}/>
                <button className="inline-field-action" type="button" onClick={() => setSelectedProduct({ ...selectedProduct, displayName: undefined, name: selectedProduct.sourceName ?? selectedProduct.name })}>Use supplier name</button>
              </FormField>
              <FormField label="Slug">
                <TextInput value={selectedProduct.slug} onChange={(event) => setSelectedProduct({ ...selectedProduct, slug: event.target.value })}/>
              </FormField>
              <FormField label="Game family">
                <TextInput value={selectedProduct.gameFamily ?? ""} placeholder="Free Fire, PUBG Mobile, Call of Duty Mobile" onChange={(event) => setSelectedProduct({ ...selectedProduct, gameFamily: event.target.value })}/>
                
              </FormField>
              <FormField label="Short description">
                <TextInput value={publicDescription(selectedProduct)} onChange={(event) => setSelectedProduct({ ...selectedProduct, merchandisingDescription: event.target.value })}/>
                
              </FormField>
            </div>
          </section>

          <div className="gaming-product-source-note">
            <div>
              <span>Supplier source</span>
              <strong>{selectedProduct.sourceName ?? selectedProduct.name}</strong>
            </div>
            
          </div>
        </div>

        <aside className="gaming-product-editor__media">
          <section className="gaming-editor-section gaming-editor-section--media">
            <div className="gaming-editor-section__heading">
              <div>
                <span>Storefront media</span>
                <strong>Product artwork</strong>
              </div>
              <Badge tone={normalizeArtworkUrl(selectedProduct.artworkUrl) ? "success" : "neutral"}>{normalizeArtworkUrl(selectedProduct.artworkUrl) ? "Configured" : "Fallback"}</Badge>
            </div>
            <FormField label="Artwork URL">
              <TextInput value={selectedProduct.artworkUrl ?? ""} placeholder="https://media.nextf.lk/a/..." onChange={(event) => {
                setArtworkPreviewFailed(false);
                setProductSaveError("");
                setSelectedProduct({ ...selectedProduct, artworkUrl: event.target.value });
              }}/>
            </FormField>
            <div className="gaming-product-upload-row">
              <MediaUploadButton
                purpose="gaming_product_artwork"
                owner={{ ownerId: selectedProduct.id }}
                label="Upload to NEXT F Media"
                onUploaded={(asset) => {
                  setArtworkPreviewFailed(false);
                  setProductSaveError("");
                  setSelectedProduct((current) => current ? { ...current, artworkUrl: asset.publicUrl } : current);
                }}
                onError={setProductSaveError}
              />
              <small>1200 × 800 recommended · WebP/JPG/PNG</small>
            </div>
            <div className="gaming-artwork-preview gaming-artwork-preview--compact">
              <span>Preview</span>
              {normalizeArtworkUrl(selectedProduct.artworkUrl) && !artworkPreviewFailed
                ? <img src={normalizeArtworkUrl(selectedProduct.artworkUrl)} alt={`${publicName(selectedProduct)} artwork preview`} referrerPolicy="no-referrer" onError={() => setArtworkPreviewFailed(true)}/>
                : <div className="gaming-artwork-preview__empty">
                    <strong>{artworkPreviewFailed ? "Artwork could not be loaded" : "No artwork configured"}</strong>
                    
                  </div>}
            </div>
          </section>
        </aside>
        {productSaveError && <div className="form-error gaming-product-editor__error">{productSaveError}</div>}
      </div>}
    </Modal>
    <Modal open={!!selectedOffer} onClose={() => setSelectedOffer(undefined)} title="Edit retail offer" description="Price and customer-facing purchase configuration.">{selectedOffer && <><div className="form-grid form-grid--two"><FormField label="Offer label"><TextInput value={selectedOffer.name} onChange={(event) => setSelectedOffer({ ...selectedOffer, name: event.target.value })}/></FormField><FormField label="Pricing mode"><SelectInput value={selectedOffer.pricingMode} onChange={(event) => setSelectedOffer({ ...selectedOffer, pricingMode: event.target.value as NextFGamingOffer["pricingMode"] })}><option value="fixed">Fixed</option><option value="supplier_quote">Supplier quote</option><option value="amount_based">Amount based</option></SelectInput></FormField><FormField label="Selling price LKR"><TextInput type="number" disabled={selectedOffer.pricingMode !== "fixed"} value={selectedOffer.sellingPriceLkr ?? ""} onChange={(event) => setSelectedOffer({ ...selectedOffer, sellingPriceLkr: Number(event.target.value) || undefined })}/></FormField><FormField label="Region warning"><TextInput value={selectedOffer.regionRule.label ?? ""} onChange={(event) => setSelectedOffer({ ...selectedOffer, regionRule: { ...selectedOffer.regionRule, label: event.target.value } })}/></FormField></div><div className="modal-actions"><Button onClick={() => setSelectedOffer(undefined)}>Cancel</Button><Button variant="primary" onClick={() => { gamingVNextStore.updateOffer(selectedOffer.id, selectedOffer); setSelectedOffer(undefined); }}>Save offer</Button></div></>}</Modal>
    <Modal open={!!selectedMapping} onClose={() => setSelectedMapping(undefined)} title="Edit supplier route" description="Set priority and cost for this supplier mapping.">{selectedMapping && <><div className="form-grid form-grid--two"><FormField label="Supplier"><TextInput value={supplierLabel(selectedMapping.supplierId)} disabled/></FormField><FormField label="Priority"><TextInput type="number" min="1" value={selectedMapping.priority} onChange={(event) => setSelectedMapping({ ...selectedMapping, priority: Math.max(1, Number(event.target.value) || 1) })}/></FormField><FormField label="Supplier cost"><TextInput type="number" step="0.0001" value={selectedMapping.supplierCost} onChange={(event) => setSelectedMapping({ ...selectedMapping, supplierCost: Number(event.target.value) || 0 })}/></FormField><FormField label="Currency"><TextInput value={selectedMapping.supplierCurrency} onChange={(event) => setSelectedMapping({ ...selectedMapping, supplierCurrency: event.target.value.toUpperCase() })}/></FormField></div><div className="modal-actions"><Button onClick={() => setSelectedMapping(undefined)}>Cancel</Button><Button variant="primary" onClick={() => { gamingVNextStore.updateMapping(selectedMapping.id, selectedMapping); setSelectedMapping(undefined); }}>Save route</Button></div></>}</Modal>
  </div>;
}
