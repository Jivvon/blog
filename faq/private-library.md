# Public blog and private library

The same repository produces two independent builds. `BLOG_PROFILE=public` is
the default. Public builds contain author content only; Contentlayer blog/resume
data, archive storage, library routes and development tools are unavailable to
public visitors. `/`, `/blog`, `/tags`, `/resume` and `/projects` redirect to
`/about`. Unknown routes, feeds, search data and API routes return 404.

`BLOG_PROFILE=private` opens the blog, `/library`, and `/lab` with draft previews.
It accepts only the configured `SITE_URL` HTTP Host. This Host check is an extra
guard, not authentication: Tailscale and the private Ingress provide the access
boundary. Both builds use `NODE_ENV=production`. Private pages are not indexed,
do not use public analytics/comments, and have private/no-store responses.

## Run and verify

Use Node 24 and the committed npm lockfile (the Yarn lockfile is updated too).

```sh
npm ci
npm test
npm run build:public
node scripts/verify-web.mjs
npm run build:private
BLOG_PROFILE=private node scripts/verify-web.mjs
npm run build:pages
npm run verify:export
```

The build wrapper clears Contentlayer/Next caches and generated feeds before
each build, including when switching from private to public. Never reuse a
private build as the public deployment. `SITE_URL` is embedded at build time;
changing it requires a rebuild.

Cloudflare Pages/static hosting can keep using `EXPORT=1 UNOPTIMIZED=1 npm run
build`, or the equivalent `npm run build:pages`, and publish `out/`. This builds
from an isolated source tree containing only the about page, its assets, robots
and sitemap. Blog/resume documents, private routes, API routes, feeds, search
exports and other public-file directories are absent from the artifact. Pages
redirects preserve the about-only public flow, and an explicit 404 prevents an
SPA fallback for unknown/private routes. The private profile refuses static
export before producing an artifact. Direct `next build` is not a supported
entry point; use the repository's build scripts so profile caches are cleared.

The live Pages build command/environment is managed outside this repository;
detailed logs require Cloudflare project access. Verify that project uses Node
24 (`.nvmrc`/Volta), the committed lockfile, the public static build command and
the `out` output directory. The final PR head's Pages preview must pass before
merging or changing the public deployment.

For local private reading:

```sh
BLOG_PROFILE=private SITE_URL=http://localhost:3020 npm run build
BLOG_PROFILE=private SITE_URL=http://localhost:3020 ARCHIVE_DIR=/absolute/private/archive npm run serve
```

## Collect anonymous free articles

The library is source-independent: schema version 2 records `sources` (stable
ID, adapter kind, display name, base URL), and each post has a `sourceId` plus
its original URL. New identifiers are namespaced to avoid collisions between
sources. The old single-publication index upgrades on read without moving old
numeric-ID paths. Search, source filtering, rendering and storage are shared.
The included Substack collector is the first adapter; additional RSS/site/file
adapters can write the same format without adding source-specific reader code.

```sh
npm run archive:sync -- --directory /absolute/private/archive
```

The collector targets only `https://1234373801.substack.com`, traverses historical
archive pagination to an empty page, and fetches post bodies anonymously. It
requires an explicit `everyone` audience and a nonempty body without paywall
markers. Paid posts are excluded; unknown access, missing bodies, pagination
loops, HTTP errors and missing images produce an incomplete report and nonzero
exit. No login, paid subscription or alternate access path is used.

The publication API is not a guaranteed stable interface. Before calling the
initial collection complete, verify its shape and compare a free article with
its anonymous browser view. The current session could not do this: the proxy
blocked the publication with HTTP 403. **No real articles have been archived.**

Original HTML, sanitized display HTML, extracted Markdown, metadata and offline
images are stored outside Git/build contexts. Imported content is never compiled
as MDX. Immutable content revisions retain older saved articles when retries
fail or upstream access changes. Local image routes validate both the filename
and its membership in the article's index. The reader uses a read-only OCI identity.

`index.json` holds the latest readable revisions. `last-run.json` and `runs/`
record discovered, archived, excluded, failed and missing-image counts. A failed
listing leaves the previous index unchanged. In local mode, `.sync-lock` refuses
concurrent writers and backups. After a crashed local process, confirm that no writer
is running before manually removing only that lock directory.

The collector follows the execution environment's existing HTTP(S) proxy and CA
settings. An explicit network denial must be resolved in that environment;
repeated requests, alternate hosts or TLS-verification bypasses are not recovery.

## Backup and restore

Production storage is a private OCI Object Storage bucket, not a cluster PVC.
The native API uses the existing OCI config/API-key format, with separate
bucket-scoped reader and writer identities. Credentials stay in server-mounted
Secrets; images are served through private library routes without public bucket
URLs or browser credentials. Set the following for both reader and collector:

```sh
ARCHIVE_STORAGE=oci
ARCHIVE_NAMESPACE=<namespace from Terraform>
ARCHIVE_BUCKET=blog-archive
OCI_CONFIG_FILE=/run/oci/config
```

The config's region must be the tenancy home region. All snapshot/image uploads
finish before publishing the new index. ETag conditional writes refuse stale
updates instead of erasing another source's newly added articles. Rerun a sync
that reports HTTP 412; its uploaded immutable snapshots remain safe. No local
archive directory or distributed lock is required for OCI mode.

Always Free-only accounts have 20 GB combined storage and 50,000 monthly API
requests; paid/trial accounts have different tier allowances. Check account
status and existing tenancy usage before rollout. The manifests do not schedule
collectors and readiness checks `/about` without reading Object Storage.
[Oracle's current free limits](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

For an OCI backup, stop writers, download to a **new private directory** using
the OCI CLI, then use the same checksum-verifying local tool below. The bucket's
durability is not a separate backup; retain a verified copy outside the tenancy.
The local backup CLI does not itself connect to OCI.

```sh
oci os object bulk-download --namespace-name YOUR_NAMESPACE --bucket-name blog-archive --download-dir /absolute/private/download
npm run archive:backup -- --source /absolute/private/download --target /separate/backup/verified-snapshot
```

```sh
npm run archive:backup -- --source /absolute/private/archive --target /separate/backup/unique-snapshot
npm run archive:backup -- --source /separate/backup/unique-snapshot --target /empty-parent/restored-archive
```

The target must not exist. The tool holds a source lock, rejects escaped
symlinks, verifies article/image SHA-256 checksums and preserves prior revisions.
It is also the restore tool: copy from a verified backup into a new archive
directory, then set `ARCHIVE_STORAGE=local ARCHIVE_DIR=...` after verifying its index. The source must
be writable for the lock. Do not replace an existing archive or reuse a backup
target. Keep backups on a different node/disk and periodically run this restore
check there; copying to another directory on the same node is not disaster
recovery. Run backups after collection and before changing storage, and arrange
recurring backups with the established home-cluster backup workflow.

## Container and cluster deployment

```sh
docker build --build-arg BLOG_PROFILE=private \
  --build-arg SITE_URL=https://blog.dev.jwjeong127.com --target runner -t blog-private .
docker build --target collector -t blog-collector .
```

Managed cloud builds additionally pass
`--secret id=proxy_ca,src="$CODEX_PROXY_CERT"` to keep the session CA out of image
layers. The collector and reader are separate targets. Build for the home
cluster's ARM64 architecture and use verified immutable digests in GitOps.

Deployment resources are in `Jivvon/gitops/apps/blog-dev`: namespace,
reader, manual collector Job, nginx Ingress and a Certificate using
the existing `letsencrypt-dns01` issuer. They deliberately contain unresolved
image placeholders until real ARM64 images are published. DNS lives in the
isolated `Jivvon/terraform-playground/cloudflare/blog-dev` Terraform root.
The bucket is in `terragrunt/jwjeong127/archive`, reusing the existing OCI
provider setup. Private access, Standard storage and encryption are OCI defaults;
there is no extra versioning, lifecycle, replication or public access setup.

Before deployment, inspect cert-manager Pods and issuer Ready state, nginx's
actual source IP/trusted-proxy settings, the existing admin Tailscale DNS target,
image-pull authentication, bucket/IAM permissions and backup destination. No
NetworkPolicy IP allowlist is included: the previous copied Pod IP and generic
private-range exceptions were not verified live. Ingress permits Tailscale
clients; other cluster Pods can access the ClusterIP service. Verify the actual
forwarding configuration and tailnet grants before calling the domain private.
The current environment has no VPN, kubeconfig, OCI key, Cloudflare token or registry identity, so
no cluster/DNS changes or production deployment have been performed.
