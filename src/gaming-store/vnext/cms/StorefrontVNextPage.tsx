import { useEffect, useMemo, useState } from "react";
import { Eye, Image, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, Modal, PageToolbar, SectionHeader, SearchSelectInput, SelectInput, TextInput, Toggle, type DataTableColumn } from "../../../shared/components";
import { flushDurableWrites, readExternalCapability } from "../../../services/production";
import { MediaUploadButton } from "../../media/MediaUploadButton";
import { gamingVNextStore } from "../runtime/store";
import { useVNextStore } from "../runtime/useVNextStore";
import type { NextFGamingGameFamily, NextFGamingHomeSection, NextFGamingProduct, NextFGamingStorefrontConfig } from "../types";

const storefrontCapability=readExternalCapability("gaming.public-storefront");
const kinds = ["topup","gift_card","game_key","steam","telegram","subscription","other"] as const;

function merchandisingKind(kind:NextFGamingProduct["kind"]):typeof kinds[number]{
  if(kind==="steam_wallet"||kind==="steam_gift") return "steam";
  if(kind==="telegram_stars"||kind==="telegram_premium") return "telegram";
  if(kind==="manual_service") return "other";
  return kind;
}

function safeHttps(value?: string) {
  const raw=value?.trim(); if(!raw) return undefined;
  try { const url=new URL(raw); return url.protocol==="https:"?url.toString():undefined; } catch { return undefined; }
}
function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function familyFromName(value:string){
  const known: Array<[RegExp,string]> = [
    [/\bpubg\b/i,"PUBG Mobile"],[/\bfree\s*fire\b/i,"Free Fire"],[/\bmobile\s+legends\b|\bmlbb\b/i,"Mobile Legends"],[/\bcall\s+of\s+duty\s+mobile\b|\bcodm\b/i,"Call of Duty Mobile"],[/\bhonor\s+of\s+kings\b/i,"Honor of Kings"],[/\barena\s+breakout\b/i,"Arena Breakout"],[/\bgenshin\s+impact\b/i,"Genshin Impact"],[/\bvalorant\b/i,"VALORANT"],[/\bsteam\b/i,"Steam"],[/\btelegram\b/i,"Telegram"],
  ];
  return known.find(([pattern])=>pattern.test(value))?.[1] ?? value.replace(/\s+-\s+.*$/," ").replace(/\s*\([^)]{2,12}\)\s*$/," ").trim();
}

export function StorefrontVNextPage(){
  const products=useVNextStore(gamingVNextStore.getProducts);
  const storedFamilies=useVNextStore(gamingVNextStore.getGameFamilies);
  const current=useVNextStore(gamingVNextStore.getStorefront);
  const [draft,setDraft]=useState<NextFGamingStorefrontConfig>(current);
  const [editingFamily,setEditingFamily]=useState<NextFGamingGameFamily>();
  const [editingSection,setEditingSection]=useState<NextFGamingHomeSection>();
  const [manualProductChoice,setManualProductChoice]=useState("");
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const [familyQuery,setFamilyQuery]=useState("");
  const [familyKind,setFamilyKind]=useState<"all" | typeof kinds[number]>("all");
  const [familyArtwork,setFamilyArtwork]=useState<"all" | "configured" | "missing">("all");
  const [familyVisibility,setFamilyVisibility]=useState<"all" | "enabled" | "disabled">("all");

  const storefrontDirty=useMemo(()=>JSON.stringify(draft)!==JSON.stringify(current),[draft,current]);
  const heroProductOptions=useMemo(()=>[
    {value:"",label:"Automatic featured product",meta:"Uses the current featured product",keywords:"automatic featured"},
    ...products.filter((product)=>product.enabled).map((product)=>({
      value:product.id,
      label:product.displayName??product.name,
      meta:[product.gameFamily,merchandisingKind(product.kind),product.id].filter(Boolean).join(" · "),
      keywords:[product.name,product.displayName,product.gameFamily,merchandisingKind(product.kind),product.kind,product.id].filter(Boolean).join(" "),
    })),
  ],[products]);

  useEffect(()=>{
    if(!storefrontDirty)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);
    return()=>window.removeEventListener("beforeunload",warn);
  },[storefrontDirty]);

  const catalogFamilies=useMemo(()=>{
    const map=new Map(storedFamilies.map((row)=>[row.name.toLowerCase(),row]));
    for(const product of products){
      const name=(product.gameFamily?.trim()||familyFromName(product.displayName??product.name)).trim();
      if(!name||map.has(name.toLowerCase())) continue;
      map.set(name.toLowerCase(),{id:`family-${slugify(name)}`,name,slug:slugify(name),enabled:true,updatedAt:new Date().toISOString()});
    }
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
  },[products,storedFamilies]);

  const familyKindsByName=useMemo(()=>{
    const map=new Map<string,Set<typeof kinds[number]>>();
    for(const product of products){
      const name=(product.gameFamily?.trim()||familyFromName(product.displayName??product.name)).trim();
      if(!name) continue;
      const key=name.toLowerCase();
      const values=map.get(key)??new Set<typeof kinds[number]>();
      values.add(merchandisingKind(product.kind));
      map.set(key,values);
    }
    return map;
  },[products]);

  const familyKindCounts=useMemo(()=>{
    const counts=new Map<typeof kinds[number],number>();
    for(const family of catalogFamilies){
      for(const kind of familyKindsByName.get(family.name.toLowerCase())??[]) counts.set(kind,(counts.get(kind)??0)+1);
    }
    return counts;
  },[catalogFamilies,familyKindsByName]);

  const filteredFamilies=useMemo(()=>{
    const query=familyQuery.trim().toLowerCase();
    return catalogFamilies.filter((family)=>{
      const familyKinds=[...(familyKindsByName.get(family.name.toLowerCase())??[])];
      const searchable=`${family.name} ${family.slug} ${familyKinds.join(" ")}`.toLowerCase();
      if(query&&!searchable.includes(query)) return false;
      if(familyKind!=="all"&&!familyKinds.includes(familyKind)) return false;
      if(familyArtwork==="configured"&&!family.artworkUrl) return false;
      if(familyArtwork==="missing"&&family.artworkUrl) return false;
      if(familyVisibility==="enabled"&&!family.enabled) return false;
      if(familyVisibility==="disabled"&&family.enabled) return false;
      return true;
    });
  },[catalogFamilies,familyArtwork,familyKind,familyKindsByName,familyQuery,familyVisibility]);

  const saveStorefront=async()=>{
    const heroUrl=draft.hero.backgroundArtworkUrl?.trim();
    if(heroUrl&&!safeHttps(heroUrl)){setError("Hero background must be a valid HTTPS URL.");return;}
    setError("");
    setSaving(true);
    const next={...draft,hero:{...draft.hero,backgroundArtworkUrl:safeHttps(heroUrl)}};
    gamingVNextStore.updateStorefront(next);
    setDraft(next);
    try{await flushDurableWrites();}catch(e){setError(e instanceof Error?e.message:"Could not save storefront merchandising.");}
    finally{setSaving(false);}
  };

  const familyColumns:DataTableColumn<NextFGamingGameFamily>[]=[
    {key:"family",header:"Game family",render:(row)=>{const categories=[...(familyKindsByName.get(row.name.toLowerCase())??[])];return <div className="entity-cell"><strong>{row.name}</strong><small>/{row.slug}{categories.length?` · ${categories.map((kind)=>kind.replaceAll("_"," ")).join(", ")}`:""}</small></div>}},
    {key:"art",header:"Card artwork",render:(row)=><Badge tone={row.artworkUrl?"success":"neutral"}>{row.artworkUrl?"Configured":"Inherited fallback"}</Badge>},
    {key:"hero",header:"Hero artwork",render:(row)=><Badge tone={row.heroArtworkUrl?"info":"neutral"}>{row.heroArtworkUrl?"Configured":"Use card art"}</Badge>},
    {key:"enabled",header:"Enabled",render:(row)=><Toggle checked={row.enabled} onChange={(enabled)=>{const rows=catalogFamilies.map((item)=>item.id===row.id?{...item,enabled,updatedAt:new Date().toISOString()}:item);gamingVNextStore.setGameFamilies(rows);}}/>},
    {key:"action",header:"",width:"90px",render:(row)=><Button onClick={()=>setEditingFamily({...row})}>Edit</Button>},
  ];
  const sectionColumns:DataTableColumn<NextFGamingHomeSection>[]=[
    {key:"section",header:"Homepage section",render:(row)=><div className="entity-cell"><strong>{row.title}</strong><small>{row.source}{row.category?` · ${row.category}`:""} · limit {row.limit}</small></div>},
    {key:"order",header:"Order",render:(row)=><Badge tone="neutral">#{row.sortOrder}</Badge>},
    {key:"enabled",header:"Public",render:(row)=><Toggle checked={row.enabled} onChange={(enabled)=>setDraft({...draft,sections:draft.sections.map((item)=>item.id===row.id?{...item,enabled}:item)})}/>},
    {key:"action",header:"",width:"90px",render:(row)=><Button onClick={()=>{setManualProductChoice("");setEditingSection({...row,productIds:[...(row.productIds??[])]});}}>Edit</Button>},
  ];

  return <div className="page"><SectionHeader eyebrow="Gaming Store" title="Storefront Merchandising" description="Control the Gaming home page, game-family artwork and merchandising rails from the CMS. Supplier sync continues to own supply facts, never these presentation settings." action={<Button variant="primary" disabled={!storefrontCapability.available} onClick={()=>storefrontCapability.available&&window.open("https://gaming.nextf.lk","_blank")}><Eye size={15}/> Open storefront</Button>}/>
    <div className="compact-metrics"><Card className="gaming-merch-metric"><Sparkles size={18}/><div><strong>{draft.sections.filter((row)=>row.enabled).length}</strong><span>live homepage rails</span></div></Card><Card className="gaming-merch-metric"><Image size={18}/><div><strong>{catalogFamilies.filter((row)=>row.artworkUrl).length}</strong><span>family artworks</span></div></Card><Card className="gaming-merch-metric"><LayoutTemplate size={18}/><div><strong>{products.filter((row)=>row.featured).length}</strong><span>featured products</span></div></Card></div>

    <Card className="gaming-storefront-editor"><div className="card-section-head"><div><span>Homepage hero</span><strong>Primary merchandising banner</strong></div><Toggle checked={draft.hero.enabled} onChange={(enabled)=>setDraft({...draft,hero:{...draft.hero,enabled}})}/></div><div className="form-grid form-grid--two gaming-storefront-hero-form"><FormField label="Hero product"><SearchSelectInput value={draft.hero.productId??""} options={heroProductOptions} searchPlaceholder="Search products…" emptyText="No matching products." onValueChange={(value)=>setDraft({...draft,hero:{...draft.hero,productId:value||undefined}})}/></FormField><FormField label="Eyebrow"><TextInput value={draft.hero.eyebrow} onChange={(e)=>setDraft({...draft,hero:{...draft.hero,eyebrow:e.target.value}})}/></FormField><FormField label="Headline override"><TextInput value={draft.hero.title??""} placeholder="Use product name" onChange={(e)=>setDraft({...draft,hero:{...draft.hero,title:e.target.value||undefined}})}/></FormField><FormField label="Description override"><TextInput value={draft.hero.description??""} placeholder="Use product description" onChange={(e)=>setDraft({...draft,hero:{...draft.hero,description:e.target.value||undefined}})}/></FormField><FormField label="Hero background artwork URL"><TextInput value={draft.hero.backgroundArtworkUrl??""} placeholder="https://media.nextf.lk/a/..." onChange={(e)=>setDraft({...draft,hero:{...draft.hero,backgroundArtworkUrl:e.target.value}})}/><div className="table-actions"><MediaUploadButton purpose="gaming_storefront_hero" owner={{ownerId:"gaming-home"}} label="Upload hero" onUploaded={(asset)=>setDraft((current)=>({...current,hero:{...current.hero,backgroundArtworkUrl:asset.publicUrl}}))} onError={setError}/></div><small className="form-note">Optional HTTPS image. NEXT F Media is preferred. If empty, game-family hero artwork then product artwork are used.</small></FormField><FormField label="Primary CTA"><TextInput value={draft.hero.primaryCtaLabel} onChange={(e)=>setDraft({...draft,hero:{...draft.hero,primaryCtaLabel:e.target.value}})}/></FormField><FormField label="Secondary CTA"><TextInput value={draft.hero.secondaryCtaLabel} onChange={(e)=>setDraft({...draft,hero:{...draft.hero,secondaryCtaLabel:e.target.value}})}/></FormField></div>{draft.hero.backgroundArtworkUrl&&safeHttps(draft.hero.backgroundArtworkUrl)?<div className="gaming-storefront-hero-preview" style={{backgroundImage:`linear-gradient(90deg,rgba(4,10,18,.92),rgba(4,10,18,.26)),url(${safeHttps(draft.hero.backgroundArtworkUrl)})`}}><span>{draft.hero.eyebrow}</span><strong>{draft.hero.title||products.find((p)=>p.id===draft.hero.productId)?.displayName||products.find((p)=>p.id===draft.hero.productId)?.name||"Featured game"}</strong></div>:null}<div className="modal-actions gaming-storefront-savebar"><div>{error?<div className="form-error">{error}</div>:<span className={`gaming-storefront-save-state ${storefrontDirty?"is-dirty":"is-saved"}`}>{storefrontDirty?"Unsaved changes":"All storefront changes saved"}</span>}</div><Button variant="primary" disabled={!storefrontDirty||saving} onClick={saveStorefront}>{saving?"Saving…":"Save changes"}</Button></div></Card>

    <SectionHeader title="Homepage sections" description="Build horizontal gaming-store rails. Featured and category sections update automatically; manual sections let you pin exact products." action={<Button onClick={()=>{setManualProductChoice("");setEditingSection({id:`section-${crypto.randomUUID().slice(0,8)}`,eyebrow:"FEATURED",title:"New section",source:"manual",productIds:[],limit:8,enabled:true,sortOrder:(Math.max(0,...draft.sections.map((row)=>row.sortOrder))+10)});}}><Plus size={14}/> Add section</Button>}/><Card><DataTable rows={[...draft.sections].sort((a,b)=>a.sortOrder-b.sortOrder)} columns={sectionColumns} getKey={(row)=>row.id}/></Card>

    <SectionHeader title="Game-family artwork" description="One image can power every regional or supplier variation of a game. Product artwork overrides family artwork; hero artwork overrides family card artwork." action={<Button onClick={async()=>{setError("");gamingVNextStore.setGameFamilies(catalogFamilies);try{await flushDurableWrites();}catch(e){setError(e instanceof Error?e.message:"Could not save game families.");}}}>Save discovered families</Button>}/><Card><PageToolbar query={familyQuery} onQueryChange={setFamilyQuery} placeholder="Search game families…"><SelectInput aria-label="Filter game families by category" value={familyKind} onChange={(event)=>setFamilyKind(event.target.value as "all" | typeof kinds[number])}><option value="all">All categories ({catalogFamilies.length})</option>{kinds.map((kind)=><option key={kind} value={kind}>{kind.replaceAll("_"," ")} ({familyKindCounts.get(kind)??0})</option>)}</SelectInput><SelectInput aria-label="Filter game families by artwork" value={familyArtwork} onChange={(event)=>setFamilyArtwork(event.target.value as "all" | "configured" | "missing")}><option value="all">All artwork</option><option value="configured">Card art configured</option><option value="missing">Card art missing</option></SelectInput><SelectInput aria-label="Filter game families by enabled status" value={familyVisibility} onChange={(event)=>setFamilyVisibility(event.target.value as "all" | "enabled" | "disabled")}><option value="all">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></SelectInput><Badge tone="neutral">{filteredFamilies.length} / {catalogFamilies.length}</Badge></PageToolbar><DataTable rows={filteredFamilies} columns={familyColumns} getKey={(row)=>row.id} empty="No game families match these filters."/></Card>

    <Modal open={!!editingFamily} onClose={()=>setEditingFamily(undefined)} title="Edit game-family artwork" description="Use one visual identity across product variants without duplicating artwork on every product.">{editingFamily&&<><div className="form-grid form-grid--two"><FormField label="Family name"><TextInput value={editingFamily.name} onChange={(e)=>setEditingFamily({...editingFamily,name:e.target.value,slug:slugify(e.target.value)})}/></FormField><FormField label="Slug"><TextInput value={editingFamily.slug} onChange={(e)=>setEditingFamily({...editingFamily,slug:slugify(e.target.value)})}/></FormField><FormField label="Card artwork URL"><TextInput value={editingFamily.artworkUrl??""} placeholder="https://media.nextf.lk/a/..." onChange={(e)=>setEditingFamily({...editingFamily,artworkUrl:e.target.value})}/><MediaUploadButton purpose="gaming_family_artwork" owner={{ownerId:editingFamily.id}} label="Upload card artwork" onUploaded={(asset)=>setEditingFamily((current)=>current?{...current,artworkUrl:asset.publicUrl}:current)} onError={setError}/></FormField><FormField label="Hero artwork URL"><TextInput value={editingFamily.heroArtworkUrl??""} placeholder="https://media.nextf.lk/a/..." onChange={(e)=>setEditingFamily({...editingFamily,heroArtworkUrl:e.target.value})}/><MediaUploadButton purpose="gaming_family_hero" owner={{ownerId:editingFamily.id}} label="Upload hero artwork" onUploaded={(asset)=>setEditingFamily((current)=>current?{...current,heroArtworkUrl:asset.publicUrl}:current)} onError={setError}/></FormField></div><div className="modal-actions"><Button onClick={()=>setEditingFamily(undefined)}>Cancel</Button><Button variant="primary" onClick={async()=>{const artwork=editingFamily.artworkUrl?.trim(),hero=editingFamily.heroArtworkUrl?.trim();if((artwork&&!safeHttps(artwork))||(hero&&!safeHttps(hero))){setError("Family artwork URLs must use HTTPS.");return;}const row={...editingFamily,artworkUrl:safeHttps(artwork),heroArtworkUrl:safeHttps(hero),updatedAt:new Date().toISOString()};gamingVNextStore.setGameFamilies([...catalogFamilies.filter((item)=>item.id!==row.id),row]);try{await flushDurableWrites();setEditingFamily(undefined);}catch(e){setError(e instanceof Error?e.message:"Could not save family artwork.");}}}>Save family</Button></div></>}</Modal>

    <Modal open={!!editingSection} onClose={()=>setEditingSection(undefined)} title="Edit homepage section" description="Choose how the store fills this rail. CMS order controls the homepage sequence.">{editingSection&&<><div className="form-grid form-grid--two"><FormField label="Eyebrow"><TextInput value={editingSection.eyebrow??""} onChange={(e)=>setEditingSection({...editingSection,eyebrow:e.target.value})}/></FormField><FormField label="Title"><TextInput value={editingSection.title} onChange={(e)=>setEditingSection({...editingSection,title:e.target.value})}/></FormField><FormField label="Description"><TextInput value={editingSection.description??""} onChange={(e)=>setEditingSection({...editingSection,description:e.target.value})}/></FormField><FormField label="Source"><SelectInput value={editingSection.source} onChange={(e)=>setEditingSection({...editingSection,source:e.target.value as NextFGamingHomeSection["source"]})}><option value="featured">Featured products</option><option value="category">Category</option><option value="manual">Manual products</option></SelectInput></FormField>{editingSection.source==="category"?<FormField label="Category"><SelectInput value={editingSection.category??"topup"} onChange={(e)=>setEditingSection({...editingSection,category:e.target.value as NextFGamingHomeSection["category"]})}>{kinds.map((kind)=><option key={kind} value={kind}>{kind.replaceAll("_"," ")}</option>)}</SelectInput></FormField>:null}{editingSection.source==="manual"?<FormField label="Manual products"><div className="gaming-manual-product-picker"><div className="gaming-manual-product-picker__add"><SelectInput value={manualProductChoice} onChange={(e)=>setManualProductChoice(e.target.value)}><option value="">Choose a product</option>{products.filter((p)=>p.enabled&&!(editingSection.productIds??[]).includes(p.id)).map((p)=><option key={p.id} value={p.id}>{p.displayName??p.name}</option>)}</SelectInput><Button disabled={!manualProductChoice} onClick={()=>{if(!manualProductChoice)return;setEditingSection({...editingSection,productIds:[...(editingSection.productIds??[]),manualProductChoice]});setManualProductChoice("");}}><Plus size={14}/> Add</Button></div><div className="gaming-manual-product-picker__list">{(editingSection.productIds??[]).map((id,index)=>{const product=products.find((p)=>p.id===id);return <button type="button" key={id} onClick={()=>setEditingSection({...editingSection,productIds:(editingSection.productIds??[]).filter((item)=>item!==id)})}><span>{index+1}</span>{product?.displayName??product?.name??id}<strong>Remove</strong></button>})}</div></div><small className="form-note">Products render in this order. Supplier sync can update their price and availability without changing the section.</small></FormField>:null}<FormField label="Maximum products"><TextInput type="number" min="1" max="20" value={editingSection.limit} onChange={(e)=>setEditingSection({...editingSection,limit:Math.max(1,Math.min(20,Number(e.target.value)||8))})}/></FormField><FormField label="Sort order"><TextInput type="number" min="1" value={editingSection.sortOrder} onChange={(e)=>setEditingSection({...editingSection,sortOrder:Math.max(1,Number(e.target.value)||10)})}/></FormField></div><div className="modal-actions"><Button onClick={()=>setEditingSection(undefined)}>Cancel</Button><Button variant="primary" onClick={async()=>{const next=[...draft.sections.filter((row)=>row.id!==editingSection.id),editingSection].sort((a,b)=>a.sortOrder-b.sortOrder);const updated={...draft,sections:next};setDraft(updated);gamingVNextStore.updateStorefront(updated);try{await flushDurableWrites();setEditingSection(undefined);}catch(e){setError(e instanceof Error?e.message:"Could not save homepage section.");}}}>Save section</Button></div></>}</Modal>
  </div>;
}
