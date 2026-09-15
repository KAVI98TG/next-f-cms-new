# NEXT F CMS v1.0.4 - Gaming Storefront Merchandising

This release adds a CMS-owned merchandising control plane for the public Gaming Store.

## New CMS area

Gaming Store -> Storefront controls:

- homepage hero product;
- hero eyebrow, headline, description and CTA labels;
- optional HTTPS hero background artwork;
- homepage rail order and visibility;
- rail source: featured products, category, or manually curated products;
- manual product order through a product picker;
- game-family card artwork;
- game-family hero artwork;
- discovered game-family registry generated from the current catalog.

The existing Digital Catalog vNext product editor also supports a NEXT F-owned `gameFamily` field.

## Artwork ownership and inheritance

Public artwork resolves in this order:

1. product artwork override;
2. matching game-family artwork;
3. storefront icon fallback.

Hero imagery resolves in this order:

1. CMS hero background override;
2. matching game-family hero artwork;
3. matching game-family card artwork;
4. product artwork.

Supplier synchronization continues to own source facts such as supplier names, offers, availability and costs. It must not overwrite NEXT F merchandising fields.

## Durable production documents

- `nextf.vnext.gaming.storefront`
- `nextf.vnext.gaming.game-families`

Both use the existing D1-backed staff-state repository. Writes require `gaming.products.manage`.

## Media

This version continues to use HTTPS artwork URLs. It does not yet upload files directly into R2. A future Media Library can replace URL entry without changing the merchandising model introduced here.
