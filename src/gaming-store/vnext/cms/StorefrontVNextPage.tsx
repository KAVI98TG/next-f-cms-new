import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Eye, Film, Image, ImageOff, LayoutTemplate, Monitor, Palette, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Card, FormField, Modal, PageToolbar, SectionHeader, SearchSelectInput, SelectInput, TextInput, Toggle } from "../../../shared/components";
import { flushDurableWrites, readExternalCapability } from "../../../services/production";
import { MediaUploadButton } from "../../media/MediaUploadButton";
import { GamingKindBadge } from "../../shared/GamingKindBadge";
import { gamingVNextStore } from "../runtime/store";
import { useVNextStore } from "../runtime/useVNextStore";
import type { NextFGamingGameFamily, NextFGamingHeroSlide, NextFGamingHomeSection, NextFGamingProduct, NextFGamingStorefrontConfig } from "../types";

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
function sourceLabel(source:NextFGamingHomeSection["source"]){return source==="featured"?"Featured":source==="category"?"Category":"Manual";}

export function StorefrontVNextPage(){
  const products=useVNextStore(gamingVNextStore.getProducts);
  const storedFamilies=useVNextStore(gamingVNextStore.getGameFamilies);
  const current=useVNextStore(gamingVNextStore.getStorefront);
  const [draft,setDraft]=useState<NextFGamingStorefrontConfig>(current);
  const [editingFamily,setEditingFamily]=useState<NextFGamingGameFamily>();
  const [editingHeroSlide,setEditingHeroSlide]=useState<NextFGamingHeroSlide>();
  const [editingSection,setEditingSection]=useState<NextFGamingHomeSection>();
  const [manualProductChoice,setManualProductChoice]=useState("");
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const [familyQuery,setFamilyQuery]=useState("");
  const [familyKind,setFamilyKind]=useState<"all" | typeof kinds[number]>("all");
  const [familyArtwork,setFamilyArtwork]=useState<"all" | "configured" | "missing">("all");
  const [familyVisibility,setFamilyVisibility]=useState<"all" | "enabled" | "disabled">("all");

  const storefrontDirty=useMemo(()=>JSON.stringify(draft)!==JSON.stringify(current),[draft,current]);
  const heroSlides=useMemo(()=>[...(draft.heroSlides??[])].sort((a,b)=>a.sortOrder-b.sortOrder),[draft.heroSlides]);
  const heroProductOptions=useMemo(()=>[
    {value:"",label:"Automatic featured product",meta:"Uses the current featured product",keywords:"automatic featured"},
    ...products.filter((product)=>product.enabled).map((product)=>{
      const productKind=merchandisingKind(product.kind);
      return {
        value:product.id,
        label:product.displayName??product.name,
        meta:[product.gameFamily,productKind,product.id].filter(Boolean).join(" · "),
        keywords:[product.name,product.displayName,product.gameFamily,productKind,product.kind,product.id].filter(Boolean).join(" "),
      };
    }),
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

  const familyProductsByName=useMemo(()=>{
    const map=new Map<string,number>();
    for(const product of products){
      const name=(product.gameFamily?.trim()||familyFromName(product.displayName??product.name)).trim();
      if(name) map.set(name.toLowerCase(),(map.get(name.toLowerCase())??0)+1);
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

  const orderedSections=useMemo(()=>[...draft.sections].sort((a,b)=>a.sortOrder-b.sortOrder),[draft.sections]);
  const discoveredFamilyCount=useMemo(()=>{
    const stored=new Set(storedFamilies.map((row)=>row.name.toLowerCase()));
    return catalogFamilies.filter((row)=>!stored.has(row.name.toLowerCase())).length;
  },[catalogFamilies,storedFamilies]);
  const selectedHeroProduct=useMemo(()=>draft.hero.productId?products.find((product)=>product.id===draft.hero.productId):products.find((product)=>product.enabled&&product.featured)??products.find((product)=>product.enabled),[draft.hero.productId,products]);
  const selectedHeroFamilyName=(selectedHeroProduct?.gameFamily?.trim()||familyFromName(selectedHeroProduct?.displayName??selectedHeroProduct?.name??"")).trim();
  const selectedHeroFamily=catalogFamilies.find((family)=>family.name.toLowerCase()===selectedHeroFamilyName.toLowerCase());
  const heroPreviewArtwork=safeHttps(draft.hero.backgroundArtworkUrl)??safeHttps(selectedHeroFamily?.heroArtworkUrl)??safeHttps(selectedHeroFamily?.artworkUrl)??safeHttps(selectedHeroProduct?.artworkUrl);
  const heroPreviewTitle=draft.hero.title||selectedHeroProduct?.displayName||selectedHeroProduct?.name||"Featured game";
  const heroPreviewDescription=draft.hero.description||selectedHeroProduct?.merchandisingDescription||selectedHeroProduct?.shortDescription||selectedHeroProduct?.description||"Feature a product, promotion or game family from the NEXT F Gaming catalog.";

  const saveStorefront=async()=>{
    const heroUrl=draft.hero.backgroundArtworkUrl?.trim();
    if(heroUrl&&!safeHttps(heroUrl)){setError("Hero background must be a valid HTTPS URL.");return;}
    if((draft.heroSlides?.length??0)>5){setError("The storefront hero supports up to 5 slides.");return;}
    for(const slide of draft.heroSlides??[]){
      if(slide.mediaUrl&&!safeHttps(slide.mediaUrl)){setError(`Hero slide ${slide.id} media must use HTTPS.`);return;}
      if(slide.posterUrl&&!safeHttps(slide.posterUrl)){setError(`Hero slide ${slide.id} poster must use HTTPS.`);return;}
      if(slide.mediaType==="video"&&!safeHttps(slide.mediaUrl)){setError("Video slides require an uploaded HTTPS MP4/WebM asset.");return;}
    }
    setError("");
    setSaving(true);
    const normalizedSlides=(draft.heroSlides??[]).map((slide)=>({...slide,mediaUrl:safeHttps(slide.mediaUrl),posterUrl:safeHttps(slide.posterUrl),durationSeconds:Math.max(4,Math.min(20,Number(slide.durationSeconds)||7))}));
    const next={...draft,hero:{...draft.hero,backgroundArtworkUrl:safeHttps(heroUrl)},heroSlides:normalizedSlides,updatedAt:new Date().toISOString()};
    gamingVNextStore.updateStorefront(next);
    setDraft(next);
    try{await flushDurableWrites();}catch(e){setError(e instanceof Error?e.message:"Could not save storefront merchandising.");}
    finally{setSaving(false);}
  };

  const moveSection=(id:string,direction:-1|1)=>{
    const rows=[...draft.sections].sort((a,b)=>a.sortOrder-b.sortOrder);
    const index=rows.findIndex((row)=>row.id===id);
    const target=index+direction;
    if(index<0||target<0||target>=rows.length)return;
    [rows[index],rows[target]]=[rows[target],rows[index]];
    setDraft({...draft,sections:rows.map((row,rowIndex)=>({...row,sortOrder:(rowIndex+1)*10}))});
  };
  const moveHeroSlide=(id:string,direction:-1|1)=>{
    const rows=[...heroSlides];const index=rows.findIndex((row)=>row.id===id);const target=index+direction;if(index<0||target<0||target>=rows.length)return;[rows[index],rows[target]]=[rows[target],rows[index]];setDraft({...draft,heroSlides:rows.map((row,rowIndex)=>({...row,sortOrder:(rowIndex+1)*10}))});
  };
  const removeHeroSlide=(id:string)=>setDraft({...draft,heroSlides:heroSlides.filter((row)=>row.id!==id).map((row,index)=>({...row,sortOrder:(index+1)*10}))});

  const sectionProductCount=(section:NextFGamingHomeSection)=>{
    if(section.source==="manual") return section.productIds?.length??0;
    if(section.source==="featured") return Math.min(section.limit,products.filter((product)=>product.enabled&&product.featured).length);
    return Math.min(section.limit,products.filter((product)=>product.enabled&&merchandisingKind(product.kind)===section.category).length);
  };

  return <div className="page storefront-builder-page">
    <SectionHeader eyebrow="Gaming Store" title="Storefront Merchandising" description="Build the Gaming home page, hero and merchandising sections." action={<div className="storefront-header-actions"><span className={`storefront-save-indicator ${storefrontDirty?"is-dirty":"is-saved"}`}>{storefrontDirty?"Unsaved changes":"All storefront changes saved"}</span>{storefrontDirty?<Button variant="primary" disabled={saving} onClick={saveStorefront}><Save size={14}/>{saving?"Saving…":"Save changes"}</Button>:null}<Button variant="primary" className={storefrontCapability.available ? "storefront-action" : "storefront-action storefront-action--unavailable"} disabled={!storefrontCapability.available} title={storefrontCapability.detail} onClick={()=>storefrontCapability.href&&window.open(storefrontCapability.href,"_blank","noopener,noreferrer")}><Eye size={15}/> {storefrontCapability.available?"Open storefront":"Storefront unavailable"}</Button></div>}/>

    {error?<div className="storefront-error-banner"><span>{error}</span><button type="button" onClick={()=>setError("")}>Dismiss</button></div>:null}

    <div className="storefront-overview-strip">
      <div><span><Monitor size={15}/>Storefront</span><strong>{storefrontCapability.available?"Connected":"Unavailable"}</strong></div>
      <div><span><LayoutTemplate size={15}/>Homepage sections</span><strong>{draft.sections.filter((row)=>row.enabled).length}</strong></div>
      <div><span><Palette size={15}/>Family artwork</span><strong>{catalogFamilies.filter((row)=>row.artworkUrl).length}/{catalogFamilies.length}</strong></div>
      <div><span><Sparkles size={15}/>Featured products</span><strong>{products.filter((row)=>row.featured&&row.enabled).length}</strong></div>
    </div>

    <Card className="storefront-hero-builder">
      <div className="storefront-builder-heading"><div><span>Homepage hero</span><h3>Mixed-media hero carousel</h3><p>Add up to five image or video slides.</p></div><div className="storefront-builder-heading__status"><Badge tone={draft.hero.enabled?"success":"neutral"}>{draft.hero.enabled?"Live":"Hidden"}</Badge><Toggle checked={draft.hero.enabled} onChange={(enabled)=>setDraft({...draft,hero:{...draft.hero,enabled}})}/></div></div>
      <div className="storefront-hero-slide-toolbar"><div><strong>{heroSlides.length} / 5 slides</strong><small>{heroSlides.length?`${heroSlides.filter((slide)=>slide.enabled).length} enabled`:`No carousel slides`}</small></div><Button disabled={heroSlides.length>=5} onClick={()=>setEditingHeroSlide({id:`hero-${crypto.randomUUID().slice(0,8)}`,enabled:true,mediaType:"image",eyebrow:"FEATURED NOW",primaryCtaLabel:"View product",secondaryCtaLabel:"Browse shop",sortOrder:(Math.max(0,...heroSlides.map((row)=>row.sortOrder))+10),durationSeconds:7})}><Plus size={14}/> Add hero slide</Button></div>
      {heroSlides.length?<div className="storefront-hero-slide-grid">{heroSlides.map((slide,index)=>{const product=slide.productId?products.find((row)=>row.id===slide.productId):undefined;return <article className={`storefront-hero-slide-card ${slide.enabled?"":"is-disabled"}`} key={slide.id}><div className="storefront-hero-slide-card__visual" style={slide.mediaType==="image"&&safeHttps(slide.mediaUrl)?{backgroundImage:`url(${safeHttps(slide.mediaUrl)})`}:slide.mediaType==="video"&&safeHttps(slide.posterUrl)?{backgroundImage:`url(${safeHttps(slide.posterUrl)})`}:undefined}>{slide.mediaType==="video"?<Film size={22}/>:<Image size={22}/>}<span>{slide.mediaType}</span></div><div className="storefront-hero-slide-card__body"><div><span>{String(index+1).padStart(2,"0")}</span><strong>{slide.title||product?.displayName||product?.name||"Automatic featured product"}</strong></div><small>{slide.eyebrow||"FEATURED NOW"} · {slide.durationSeconds||7}s</small><div><Badge tone={slide.enabled?"success":"neutral"}>{slide.enabled?"Enabled":"Hidden"}</Badge><Badge tone={slide.mediaType==="video"?"info":"neutral"}>{slide.mediaType==="video"?"Video":"Image"}</Badge></div></div><div className="storefront-hero-slide-card__actions"><button type="button" disabled={index===0} onClick={()=>moveHeroSlide(slide.id,-1)} aria-label="Move slide up"><ChevronUp size={14}/></button><button type="button" disabled={index===heroSlides.length-1} onClick={()=>moveHeroSlide(slide.id,1)} aria-label="Move slide down"><ChevronDown size={14}/></button><Button onClick={()=>setEditingHeroSlide({...slide})}>Edit</Button><button type="button" className="storefront-hero-slide-delete" onClick={()=>removeHeroSlide(slide.id)} aria-label="Delete slide"><Trash2 size={14}/></button></div></article>})}</div>:null}
      <div className="storefront-fallback-label"><span>Fallback hero</span></div>
      <div className="storefront-hero-layout">
        <div className="storefront-hero-controls gaming-storefront-hero-form">
          <FormField label="Hero product"><SearchSelectInput value={draft.hero.productId??""} options={heroProductOptions} searchPlaceholder="Search products…" emptyText="No matching products." onValueChange={(value)=>setDraft({...draft,hero:{...draft.hero,productId:value||undefined}})}/></FormField>
          <div className="form-grid form-grid--two"><FormField label="Eyebrow"><TextInput value={draft.hero.eyebrow} onChange={(e)=>setDraft({...draft,hero:{...draft.hero,eyebrow:e.target.value}})}/></FormField><FormField label="Headline override"><TextInput value={draft.hero.title??""} placeholder="Use product name" onChange={(e)=>setDraft({...draft,hero:{...draft.hero,title:e.target.value||undefined}})}/></FormField></div>
          <FormField label="Description override"><TextInput value={draft.hero.description??""} placeholder="Use product description" onChange={(e)=>setDraft({...draft,hero:{...draft.hero,description:e.target.value||undefined}})}/></FormField>
          <div className="form-grid form-grid--two"><FormField label="Primary CTA"><TextInput value={draft.hero.primaryCtaLabel} onChange={(e)=>setDraft({...draft,hero:{...draft.hero,primaryCtaLabel:e.target.value}})}/></FormField><FormField label="Secondary CTA"><TextInput value={draft.hero.secondaryCtaLabel} onChange={(e)=>setDraft({...draft,hero:{...draft.hero,secondaryCtaLabel:e.target.value}})}/></FormField></div>
          <FormField label="Hero background artwork URL"><TextInput value={draft.hero.backgroundArtworkUrl??""} placeholder="https://media.nextf.lk/a/..." onChange={(e)=>setDraft({...draft,hero:{...draft.hero,backgroundArtworkUrl:e.target.value}})}/><div className="storefront-media-row"><MediaUploadButton purpose="gaming_storefront_hero" owner={{ownerId:"gaming-home"}} label="Upload hero" onUploaded={(asset)=>setDraft((value)=>({...value,hero:{...value.hero,backgroundArtworkUrl:asset.publicUrl}}))} onError={setError}/></div></FormField>
        </div>
        <div className="storefront-hero-preview-shell">
          <div className={`gaming-storefront-hero-preview storefront-live-preview ${heroPreviewArtwork?"has-artwork":"is-fallback"}`} style={heroPreviewArtwork?{backgroundImage:`linear-gradient(90deg,rgba(4,10,18,.94),rgba(4,10,18,.38)),url(${heroPreviewArtwork})`}:undefined}>
            <div className="storefront-live-preview__status"><span>Live preview</span>{selectedHeroProduct?<GamingKindBadge kind={merchandisingKind(selectedHeroProduct.kind)}/>:null}</div>
            <div className="storefront-live-preview__content"><span>{draft.hero.eyebrow||"FEATURED NOW"}</span><strong>{heroPreviewTitle}</strong><p>{heroPreviewDescription}</p><div className="storefront-live-preview__actions"><button type="button">{draft.hero.primaryCtaLabel||"View product"}</button><button type="button">{draft.hero.secondaryCtaLabel||"Browse shop"}</button></div></div>
          </div>
          <div className="storefront-preview-meta"><div><span>Product</span><strong>{selectedHeroProduct?.displayName??selectedHeroProduct?.name??"Automatic featured product"}</strong></div><div><span>Artwork source</span><strong>{safeHttps(draft.hero.backgroundArtworkUrl)?"Hero override":selectedHeroFamily?.heroArtworkUrl?"Family hero":selectedHeroFamily?.artworkUrl?"Family card":selectedHeroProduct?.artworkUrl?"Product artwork":"Fallback styling"}</strong></div></div>
        </div>
      </div>
    </Card>

    <section className="storefront-builder-section">
      <div className="storefront-builder-section__head"><div><span>Homepage sections</span><h2>Merchandising rails</h2></div><Button onClick={()=>{setManualProductChoice("");setEditingSection({id:`section-${crypto.randomUUID().slice(0,8)}`,eyebrow:"FEATURED",title:"New section",source:"manual",productIds:[],limit:8,enabled:true,sortOrder:(Math.max(0,...draft.sections.map((row)=>row.sortOrder))+10)});}}><Plus size={14}/> Add section</Button></div>
      <div className="storefront-section-grid">{orderedSections.map((section,index)=><Card key={section.id} className={`storefront-section-card ${section.enabled?"is-public":"is-hidden"}`}>
        <div className="storefront-section-card__top"><div className="storefront-section-card__order"><button type="button" disabled={index===0} onClick={()=>moveSection(section.id,-1)} aria-label={`Move ${section.title} up`}><ChevronUp size={14}/></button><b>{String(index+1).padStart(2,"0")}</b><button type="button" disabled={index===orderedSections.length-1} onClick={()=>moveSection(section.id,1)} aria-label={`Move ${section.title} down`}><ChevronDown size={14}/></button></div><div className="storefront-section-card__badges"><Badge tone={section.source==="manual"?"info":"neutral"}>{sourceLabel(section.source)}</Badge>{section.source==="category"&&section.category?<GamingKindBadge kind={section.category}/>:null}</div></div>
        <div className="storefront-section-card__body"><span>{section.eyebrow||"SECTION"}</span><strong>{section.title}</strong><p>{section.description||`${sourceLabel(section.source)} merchandising rail using up to ${section.limit} products.`}</p></div>
        <div className="storefront-section-card__stats"><div><span>Products</span><strong>{sectionProductCount(section)}</strong></div><div><span>Limit</span><strong>{section.limit}</strong></div><div><span>Status</span><strong>{section.enabled?"Public":"Hidden"}</strong></div></div>
        <div className="storefront-section-card__footer"><Toggle checked={section.enabled} onChange={(enabled)=>setDraft({...draft,sections:draft.sections.map((item)=>item.id===section.id?{...item,enabled}:item)})}/><Button onClick={()=>{setManualProductChoice("");setEditingSection({...section,productIds:[...(section.productIds??[])]});}}>Edit section</Button></div>
      </Card>)}</div>
    </section>

    <section className="storefront-builder-section">
      <div className="storefront-builder-section__head"><div><span>Game-family artwork</span><h2>Visual identity workspace</h2></div>{discoveredFamilyCount>0?<Button onClick={async()=>{setError("");gamingVNextStore.setGameFamilies(catalogFamilies);try{await flushDurableWrites();}catch(e){setError(e instanceof Error?e.message:"Could not save game families.");}}}><CheckCircle2 size={14}/> Save discovered families ({discoveredFamilyCount})</Button>:<Badge tone="success">Family registry current</Badge>}</div>
      <Card className="storefront-family-workspace"><PageToolbar query={familyQuery} onQueryChange={setFamilyQuery} placeholder="Search game families…"><SelectInput aria-label="Filter game families by category" value={familyKind} onChange={(event)=>setFamilyKind(event.target.value as "all" | typeof kinds[number])}><option value="all">All categories ({catalogFamilies.length})</option>{kinds.map((kind)=><option key={kind} value={kind}>{kind.replaceAll("_"," ")} ({familyKindCounts.get(kind)??0})</option>)}</SelectInput><SelectInput aria-label="Filter game families by artwork" value={familyArtwork} onChange={(event)=>setFamilyArtwork(event.target.value as "all" | "configured" | "missing")}><option value="all">All artwork</option><option value="configured">Card art configured</option><option value="missing">Card art missing</option></SelectInput><SelectInput aria-label="Filter game families by enabled status" value={familyVisibility} onChange={(event)=>setFamilyVisibility(event.target.value as "all" | "enabled" | "disabled")}><option value="all">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></SelectInput><Badge tone="neutral">{filteredFamilies.length} / {catalogFamilies.length}</Badge></PageToolbar>
        {filteredFamilies.length?<div className="storefront-family-grid">{filteredFamilies.map((family)=>{const categories=[...(familyKindsByName.get(family.name.toLowerCase())??[])];const artwork=safeHttps(family.artworkUrl);return <article key={family.id} className={`storefront-family-card ${family.enabled?"":"is-disabled"}`}>
          <div className={`storefront-family-card__visual ${artwork?"has-artwork":"is-fallback"}`} style={artwork?{backgroundImage:`linear-gradient(180deg,rgba(5,10,18,.05),rgba(5,10,18,.72)),url(${artwork})`}:undefined}>{!artwork?<ImageOff size={24}/>:null}<span>{family.heroArtworkUrl?"Hero + card":"Card artwork"}</span></div>
          <div className="storefront-family-card__body"><div><strong>{family.name}</strong><small>/{family.slug} · {familyProductsByName.get(family.name.toLowerCase())??0} products</small></div>{categories.length?<span className="gaming-family-kinds">{categories.map((kind)=><GamingKindBadge key={kind} kind={kind}/>)}</span>:null}<div className="storefront-family-card__meta"><Badge tone={family.artworkUrl?"success":"warning"}>{family.artworkUrl?"Artwork configured":"Artwork missing"}</Badge>{family.heroArtworkUrl?<Badge tone="info">Hero configured</Badge>:null}</div></div>
          <div className="storefront-family-card__footer"><Toggle checked={family.enabled} onChange={(enabled)=>{const rows=catalogFamilies.map((item)=>item.id===family.id?{...item,enabled,updatedAt:new Date().toISOString()}:item);gamingVNextStore.setGameFamilies(rows);}}/><Button onClick={()=>setEditingFamily({...family})}>Edit artwork</Button></div>
        </article>})}</div>:<div className="storefront-family-empty"><Image size={20}/><div><strong>No game families match these filters</strong><small>Clear or change the filters to view the artwork workspace.</small></div></div>}
      </Card>
    </section>

    <Modal open={!!editingHeroSlide} onClose={()=>setEditingHeroSlide(undefined)} title="Edit hero carousel slide" description="Configure the slide media, content and duration.">{editingHeroSlide&&<><div className="form-grid form-grid--two"><FormField label="Media type"><SelectInput value={editingHeroSlide.mediaType} onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,mediaType:e.target.value as "image"|"video"})}><option value="image">Image</option><option value="video">Video</option></SelectInput></FormField><FormField label="Status"><SelectInput value={editingHeroSlide.enabled?"enabled":"hidden"} onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,enabled:e.target.value==="enabled"})}><option value="enabled">Enabled</option><option value="hidden">Hidden</option></SelectInput></FormField><FormField label="Hero product"><SearchSelectInput value={editingHeroSlide.productId??""} options={heroProductOptions} searchPlaceholder="Search products…" emptyText="No matching products." onValueChange={(value)=>setEditingHeroSlide({...editingHeroSlide,productId:value||undefined})}/></FormField><FormField label="Slide duration (seconds)"><TextInput type="number" min="4" max="20" value={editingHeroSlide.durationSeconds} onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,durationSeconds:Math.max(4,Math.min(20,Number(e.target.value)||7))})}/></FormField><FormField label="Eyebrow"><TextInput value={editingHeroSlide.eyebrow} onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,eyebrow:e.target.value})}/></FormField><FormField label="Headline override"><TextInput value={editingHeroSlide.title??""} placeholder="Use product name" onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,title:e.target.value||undefined})}/></FormField><FormField label="Description"><TextInput value={editingHeroSlide.description??""} placeholder="Use product description" onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,description:e.target.value||undefined})}/></FormField><FormField label="Primary CTA"><TextInput value={editingHeroSlide.primaryCtaLabel} onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,primaryCtaLabel:e.target.value})}/></FormField><FormField label="Secondary CTA"><TextInput value={editingHeroSlide.secondaryCtaLabel} onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,secondaryCtaLabel:e.target.value})}/></FormField><FormField label={editingHeroSlide.mediaType==="video"?"Video URL":"Image URL"}><TextInput value={editingHeroSlide.mediaUrl??""} placeholder="https://media.nextf.lk/a/..." onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,mediaUrl:e.target.value})}/><MediaUploadButton purpose={editingHeroSlide.mediaType==="video"?"gaming_storefront_video":"gaming_storefront_hero"} owner={{ownerId:editingHeroSlide.id}} accept={editingHeroSlide.mediaType==="video"?"video/mp4,video/webm":"image/jpeg,image/png,image/webp,image/gif"} label={editingHeroSlide.mediaType==="video"?"Upload video":"Upload image"} onUploaded={(asset)=>setEditingHeroSlide((value)=>value?{...value,mediaUrl:asset.publicUrl}:value)} onError={setError}/></FormField>{editingHeroSlide.mediaType==="video"?<FormField label="Video poster / fallback image"><TextInput value={editingHeroSlide.posterUrl??""} placeholder="https://media.nextf.lk/a/..." onChange={(e)=>setEditingHeroSlide({...editingHeroSlide,posterUrl:e.target.value})}/><MediaUploadButton purpose="gaming_storefront_hero" owner={{ownerId:`${editingHeroSlide.id}-poster`}} label="Upload poster" onUploaded={(asset)=>setEditingHeroSlide((value)=>value?{...value,posterUrl:asset.publicUrl}:value)} onError={setError}/></FormField>:null}</div><div className="modal-actions"><Button onClick={()=>setEditingHeroSlide(undefined)}>Cancel</Button><Button variant="primary" onClick={()=>{const media=editingHeroSlide.mediaUrl?.trim(),poster=editingHeroSlide.posterUrl?.trim();if(media&&!safeHttps(media)){setError("Hero slide media must use HTTPS.");return;}if(poster&&!safeHttps(poster)){setError("Video poster must use HTTPS.");return;}if(editingHeroSlide.mediaType==="video"&&!safeHttps(media)){setError("Upload a video before applying this slide.");return;}const row={...editingHeroSlide,mediaUrl:safeHttps(media),posterUrl:safeHttps(poster)};const rows=[...heroSlides.filter((item)=>item.id!==row.id),row].sort((a,b)=>a.sortOrder-b.sortOrder);setDraft({...draft,heroSlides:rows});setEditingHeroSlide(undefined);}}>Apply slide</Button></div></>}</Modal>

    <Modal open={!!editingFamily} onClose={()=>setEditingFamily(undefined)} title="Edit game-family artwork" description="Set the card and hero artwork for this game family.">{editingFamily&&<><div className="form-grid form-grid--two"><FormField label="Family name"><TextInput value={editingFamily.name} onChange={(e)=>setEditingFamily({...editingFamily,name:e.target.value,slug:slugify(e.target.value)})}/></FormField><FormField label="Slug"><TextInput value={editingFamily.slug} onChange={(e)=>setEditingFamily({...editingFamily,slug:slugify(e.target.value)})}/></FormField><FormField label="Card artwork URL"><TextInput value={editingFamily.artworkUrl??""} placeholder="https://media.nextf.lk/a/..." onChange={(e)=>setEditingFamily({...editingFamily,artworkUrl:e.target.value})}/><MediaUploadButton purpose="gaming_family_artwork" owner={{ownerId:editingFamily.id}} label="Upload card artwork" onUploaded={(asset)=>setEditingFamily((value)=>value?{...value,artworkUrl:asset.publicUrl}:value)} onError={setError}/></FormField><FormField label="Hero artwork URL"><TextInput value={editingFamily.heroArtworkUrl??""} placeholder="https://media.nextf.lk/a/..." onChange={(e)=>setEditingFamily({...editingFamily,heroArtworkUrl:e.target.value})}/><MediaUploadButton purpose="gaming_family_hero" owner={{ownerId:editingFamily.id}} label="Upload hero artwork" onUploaded={(asset)=>setEditingFamily((value)=>value?{...value,heroArtworkUrl:asset.publicUrl}:value)} onError={setError}/></FormField></div><div className="modal-actions"><Button onClick={()=>setEditingFamily(undefined)}>Cancel</Button><Button variant="primary" onClick={async()=>{const artwork=editingFamily.artworkUrl?.trim(),hero=editingFamily.heroArtworkUrl?.trim();if((artwork&&!safeHttps(artwork))||(hero&&!safeHttps(hero))){setError("Family artwork URLs must use HTTPS.");return;}const row={...editingFamily,artworkUrl:safeHttps(artwork),heroArtworkUrl:safeHttps(hero),updatedAt:new Date().toISOString()};gamingVNextStore.setGameFamilies([...catalogFamilies.filter((item)=>item.id!==row.id),row]);try{await flushDurableWrites();setEditingFamily(undefined);}catch(e){setError(e instanceof Error?e.message:"Could not save family artwork.");}}}>Save family</Button></div></>}</Modal>

    <Modal open={!!editingSection} onClose={()=>setEditingSection(undefined)} title="Edit homepage section" description="Choose the section content and display order.">{editingSection&&<><div className="form-grid form-grid--two"><FormField label="Eyebrow"><TextInput value={editingSection.eyebrow??""} onChange={(e)=>setEditingSection({...editingSection,eyebrow:e.target.value})}/></FormField><FormField label="Title"><TextInput value={editingSection.title} onChange={(e)=>setEditingSection({...editingSection,title:e.target.value})}/></FormField><FormField label="Description"><TextInput value={editingSection.description??""} onChange={(e)=>setEditingSection({...editingSection,description:e.target.value})}/></FormField><FormField label="Source"><SelectInput value={editingSection.source} onChange={(e)=>setEditingSection({...editingSection,source:e.target.value as NextFGamingHomeSection["source"]})}><option value="featured">Featured products</option><option value="category">Category</option><option value="manual">Manual products</option></SelectInput></FormField>{editingSection.source==="category"?<FormField label="Category"><SelectInput value={editingSection.category??"topup"} onChange={(e)=>setEditingSection({...editingSection,category:e.target.value as NextFGamingHomeSection["category"]})}>{kinds.map((kind)=><option key={kind} value={kind}>{kind.replaceAll("_"," ")}</option>)}</SelectInput></FormField>:null}{editingSection.source==="manual"?<FormField label="Manual products"><div className="gaming-manual-product-picker"><div className="gaming-manual-product-picker__add"><SelectInput value={manualProductChoice} onChange={(e)=>setManualProductChoice(e.target.value)}><option value="">Choose a product</option>{products.filter((product)=>product.enabled&&!(editingSection.productIds??[]).includes(product.id)).map((product)=><option key={product.id} value={product.id}>{product.displayName??product.name}</option>)}</SelectInput><Button disabled={!manualProductChoice} onClick={()=>{if(!manualProductChoice)return;setEditingSection({...editingSection,productIds:[...(editingSection.productIds??[]),manualProductChoice]});setManualProductChoice("");}}><Plus size={14}/> Add</Button></div><div className="gaming-manual-product-picker__list">{(editingSection.productIds??[]).map((id,index)=>{const product=products.find((row)=>row.id===id);return <button type="button" key={id} onClick={()=>setEditingSection({...editingSection,productIds:(editingSection.productIds??[]).filter((item)=>item!==id)})}><span>{index+1}</span>{product?.displayName??product?.name??id}<strong>Remove</strong></button>})}</div></div></FormField>:null}<FormField label="Maximum products"><TextInput type="number" min="1" max="20" value={editingSection.limit} onChange={(e)=>setEditingSection({...editingSection,limit:Math.max(1,Math.min(20,Number(e.target.value)||8))})}/></FormField></div><div className="modal-actions"><Button onClick={()=>setEditingSection(undefined)}>Cancel</Button><Button variant="primary" onClick={()=>{const next=[...draft.sections.filter((row)=>row.id!==editingSection.id),editingSection].sort((a,b)=>a.sortOrder-b.sortOrder);setDraft({...draft,sections:next});setEditingSection(undefined);}}>Apply to draft</Button></div></>}</Modal>
  </div>;
}
