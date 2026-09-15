# Gaming artwork control — CMS v1.0.3

The Gaming vNext product editor now owns customer-facing artwork as a NEXT F merchandising field. Staff can paste a valid HTTPS image URL, preview it, and save it to the production durable-state document `nextf.vnext.gaming.products`.

Supplier sync owns source catalog facts. It must not overwrite `displayName`, `merchandisingDescription`, `artworkUrl`, `featured`, public visibility, or an existing public slug. Clearing the artwork URL intentionally returns the storefront to its icon fallback.

Recommended product artwork: landscape 1200 × 800, WebP/JPG/PNG, served over HTTPS from a stable NEXT F-controlled CDN when available.
