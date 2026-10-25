#!/usr/bin/env python3
"""Observe official sources and reconcile a curated index, never update laws.

HTTP availability, content observation and normative review are different facts.
The monitor writes only its own state/report/snapshots, outside published dist.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
import difflib
import hashlib
from html.parser import HTMLParser
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import threading
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILES = (
    "data/process/official-sources.json",
    "data/process/safety-sources.json",
)
MAX_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 5
NORMALIZATION_VERSION = 1
USER_AGENT = "LegislacaoAutomotiva-SourceMonitor/1.0 (+https://github.com/FLeone2/legislacao-automotiva)"


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def fold(value):
    return "".join(
        c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c)
    ).lower()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def official_url(url, resolver=None):
    """Validate each seed/redirect; discovered links are not fetched recursively."""
    parsed = urlsplit(url)
    host = (parsed.hostname or "").lower()
    if (
        parsed.scheme != "https"
        or not (host == "gov.br" or host.endswith(".gov.br"))
        or parsed.username
        or parsed.password
        or parsed.port not in (None, 443)
    ):
        raise ValueError("URL fora da origem oficial HTTPS permitida")
    if resolver is not None:
        addresses = resolver(host, 443, type=socket.SOCK_STREAM)
        if not addresses or any(
            not ipaddress.ip_address(item[4][0]).is_global for item in addresses
        ):
            raise ValueError("Destino DNS privado, reservado ou indisponível")
    return urlunsplit(("https", parsed.netloc.lower(), parsed.path, parsed.query, ""))


@dataclass
class FetchResult:
    status: int
    url: str
    headers: dict
    body: bytes = b""


class SafeRedirect(HTTPRedirectHandler):
    def __init__(self, resolver):
        self.resolver = resolver
        self.count = 0

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.count += 1
        if self.count > MAX_REDIRECTS:
            raise ValueError("Limite de redirecionamentos excedido")
        official_url(urljoin(req.full_url, newurl), self.resolver)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url, headers, timeout=15, max_bytes=MAX_BYTES, resolver=socket.getaddrinfo):
    official_url(url, resolver)
    # The default opener retains inherited proxy settings and normal TLS trust.
    opener = build_opener(SafeRedirect(resolver))
    target = url
    for attempt in range(2):
        # A .pdf URL can be a Plone HTML preview. Never use the PDF ETag to
        # validate that preview, because its markup and the file can change separately.
        conditional = (
            {}
            if attempt == 0 and urlsplit(url).path.lower().endswith(".pdf")
            else headers
        )
        request = Request(target, headers={"User-Agent": USER_AGENT, **conditional})
        try:
            response = opener.open(request, timeout=timeout)
        except HTTPError as error:
            try:
                return FetchResult(
                    error.code, official_url(error.url, resolver), dict(error.headers)
                )
            finally:
                error.close()
        with response:
            final = official_url(response.url, resolver)
            if int(response.headers.get("Content-Length", "0")) > max_bytes:
                raise ValueError("Documento excede o limite de bytes da coleta")
            body = response.read(max_bytes + 1)
            if len(body) > max_bytes:
                raise ValueError("Documento excede o limite de bytes da coleta")
            result = FetchResult(response.status, final, dict(response.headers), body)
        download = preview_download_url(result) if attempt == 0 else None
        if download:
            target = official_url(download, resolver)
            continue
        return result


class ContentParser(HTMLParser):
    """Keep useful text/links; ignore executable content and common page chrome."""

    SKIP = {"script", "style", "noscript", "svg", "nav", "header", "footer", "form"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.main = 0
        self.main_seen = False
        self.all_text, self.main_text, self.headings = [], [], []
        self.heading = None
        self.anchor = None
        self.anchors = []
        self.rows = []
        self.previous_paragraph = []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
        if tag == "main":
            self.main += 1
            self.main_seen = True
        if (
            tag
            in {
                "p",
                "div",
                "main",
                "article",
                "section",
                "tr",
                "li",
                "h1",
                "h2",
                "h3",
                "br",
            }
            and not self.skip
        ):
            self.all_text.append("\n")
            if self.main:
                self.main_text.append("\n")
            for row in self.rows:
                row["text"].append("\n")
        if tag in {"tr", "li", "p"} and not self.skip:
            self.rows.append({"tag": tag, "text": [], "anchors": []})
        if tag in {"title", "h1", "h2"}:
            self.heading = []
        if tag == "a" and not self.skip:
            self.anchor = {
                "href": dict(attrs).get("href", ""),
                "label": [],
                "insideMain": self.main > 0,
                "precedingText": "".join(self.rows[-1]["text"])[-30:]
                if self.rows
                else "",
            }

    def handle_data(self, data):
        if self.heading is not None:
            self.heading.append(data)
        if self.skip:
            return
        self.all_text.append(data)
        if self.main:
            self.main_text.append(data)
        if self.anchor is not None:
            self.anchor["label"].append(data)
        for row in self.rows:
            row["text"].append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self.anchor is not None:
            anchor = self.anchor
            anchor["label"] = "".join(anchor["label"]).strip()
            anchor["originalLabel"] = anchor["label"]
            # The MDIC page contains literal P<a>ORTARIA ...</a>. Recover only
            # that adjacent character, rather than guessing a citation identity.
            if re.match(r"^ortaria\b", fold(anchor["label"])) and re.search(
                r"\bP$", anchor["precedingText"]
            ):
                anchor["label"] = "P" + anchor["label"]
            anchor["context"] = anchor["label"]
            self.anchors.append(anchor)
            for row in self.rows:
                row["anchors"].append(anchor)
            self.anchor = None
        if self.rows and tag == self.rows[-1]["tag"]:
            row = self.rows.pop()
            for anchor in row["anchors"]:
                anchor["context"] = "".join(row["text"])
            if tag == "p":
                if not row["anchors"] and self.previous_paragraph:
                    for anchor in self.previous_paragraph:
                        anchor["context"] += "\n" + "".join(row["text"])
                    self.previous_paragraph = []
                else:
                    self.previous_paragraph = row["anchors"]
        if tag in {"title", "h1", "h2"} and self.heading is not None:
            self.headings.append(" ".join(self.heading))
            self.heading = None
        if tag == "main":
            self.main = max(0, self.main - 1)
        if tag in self.SKIP:
            self.skip = max(0, self.skip - 1)


def preview_download_url(result):
    """Resolve only the explicit same-file download on an official PDF preview."""
    source = urlsplit(result.url)
    if result.body.startswith(b"%PDF-") or not source.path.lower().endswith(".pdf"):
        return None
    parser = ContentParser()
    parser.feed(result.body.decode("utf-8", errors="replace"))
    for anchor in parser.anchors:
        target = urljoin(result.url, anchor["href"])
        parsed = urlsplit(target)
        prefix = source.path.rstrip("/")
        suffix = (
            parsed.path[len(prefix) :] if parsed.path.startswith(prefix + "/") else ""
        )
        if (
            parsed.scheme == "https"
            and parsed.netloc.lower() == source.netloc.lower()
            and (
                suffix in {"/@@display-file/file", "/@@download/file"}
                or suffix.startswith("/@@download/file/")
            )
        ):
            return official_url(target)
    return None


def whitespace(value):
    return re.sub(r"\s+", " ", value).strip()


def unavailable_page(result, parser, text):
    path = fold(urlsplit(result.url).path)
    if re.search(r"(?:maintenance|manutencao|indisponivel)(?:[./_-]|$)", path):
        return "maintenance"
    if any(
        part in path for part in ("require_login", "credentials_cookie_auth", "/login")
    ):
        return "authentication_required"
    headings = fold(" ".join(parser.headings))
    patterns = (
        r"(?:site|portal|sistema|pagina|servico).{0,30}(?:em manutencao|indisponivel)",
        r"\bem manutencao\b",
        r"service unavailable|under maintenance|access denied|just a moment",
        r"verifying.{0,20}human|verifique.{0,20}humano",
    )
    if any(re.search(pattern, headings) for pattern in patterns):
        return "maintenance_or_access_challenge"
    if len(text) < 4000 and re.search(
        r"site em manutencao|sistema em manutencao|temporariamente indisponivel|service unavailable",
        fold(text),
    ):
        return "maintenance_or_access_challenge"
    return None


def canonical_content(result, source):
    if result.body.startswith(b"%PDF-"):
        return {
            "kind": "pdf_bytes",
            "normalizedSha256": digest(result.body),
            "text": "",
            "anchors": [],
        }
    parser = ContentParser()
    parser.feed(result.body.decode("utf-8", errors="replace"))
    text = whitespace(
        "".join(parser.main_text if parser.main_seen else parser.all_text)
    )
    reason = unavailable_page(result, parser, text)
    if reason:
        raise ValueError(reason)
    if re.search(r"\.pdf(?:/|$)", urlsplit(source["url"]).path, re.I):
        raise ValueError("unexpected_html_for_pdf")
    if len(text) < 40:
        raise ValueError("insufficient_readable_content")
    anchors = []
    for anchor in parser.anchors:
        if parser.main_seen and not anchor["insideMain"]:
            continue
        original_href = urljoin(result.url, anchor["href"])
        try:
            parsed_href = urlsplit(original_href)
            if parsed_href.scheme == "http" and parsed_href.port in (None, 80):
                # Preserve an official HTTP citation as evidence without fetching
                # HTTP or pretending its HTTPS variant was verified.
                target = official_url(
                    urlunsplit(
                        (
                            "https",
                            parsed_href.netloc,
                            parsed_href.path,
                            parsed_href.query,
                            "",
                        )
                    )
                )
                link_status = "https_variant_not_fetched"
            else:
                target = official_url(original_href)
                link_status = "official_https_reference_not_fetched"
        except ValueError:
            continue
        anchors.append(
            {
                "url": target,
                "label": whitespace(anchor["label"]),
                "context": whitespace(anchor["context"])[:2000],
                "originalHref": original_href,
                "originalLabel": anchor["originalLabel"],
                "linkStatus": link_status,
            }
        )
    if len(anchors) > 5000:
        raise ValueError("too_many_official_links_for_complete_observation")
    # Link identity changes matter even when anchor text is unchanged.
    links = sorted(
        {anchor["url"] + "\t" + anchor["originalHref"] for anchor in anchors}
    )
    canonical = text + "\n" + "\n".join(links)
    return {
        "kind": "html_useful_text_and_official_links",
        "normalizedSha256": digest(canonical.encode()),
        "text": text,
        "anchors": anchors,
    }


MDIC_CITATION = re.compile(
    r"\bportaria\s+(?:gm\s*[/\-]\s*mdic|mdic\s*[/\-]\s*gm|mdic)\s*(?:n[º°o.\s]*\s*)?"
    r"(?P<number>\d[\d.]*)\s*(?:[/\-]\s*(?P<year>20\d{2})\b"
    r"|,?\s+de\s+\d{1,2}\s+de\s+[a-z]+\s+de\s+(?P<longyear>20\d{2})\b)",
    re.I,
)


def mdic_citations(text):
    result = []
    for match in MDIC_CITATION.finditer(fold(text)):
        number = str(int(match["number"].replace(".", "")))
        year = match["year"] or match["longyear"]
        result.append(
            {
                "key": f"MDIC:portaria:{number}:{year}",
                "agency": "MDIC",
                "actType": "portaria",
                "number": number,
                "year": int(year),
            }
        )
    return result


def known_citations(root=ROOT):
    index = json.loads((root / "data/process/knowledge-index.json").read_text())
    site = json.loads((root / "data/site/index.json").read_text())
    # A known historical identity must not be rediscovered as a new active law.
    records = [*index["tables"]["acts"], *site.get("historicalReferences", [])]
    return {
        citation["key"] for act in records for citation in mdic_citations(act["title"])
    }


def registered_candidates(root=ROOT):
    """Index-only editorial candidates remain review work, never active laws."""
    path = root / "data/mover/reviewed-map.json"
    document = json.loads(path.read_text())
    return {
        citation["key"]: {
            "candidateId": record["id"],
            "provenance": {
                "path": "data/mover/reviewed-map.json",
                "pointer": f"/candidates/{position}",
            },
            "legalStatus": record.get("legalStatus"),
            "reviewStatus": record.get("reviewStatus"),
            "publication": record.get("publication"),
        }
        for position, record in enumerate(document.get("candidates", []))
        for citation in mdic_citations(record.get("title", ""))
    }


def index_citations(source, anchors, known):
    if source.get("citationPolicy") != "mdic_portarias_automotive":
        return []
    found = {}
    for anchor in anchors:
        primary = mdic_citations(anchor["label"])
        if not primary:
            continue
        context = fold(anchor["context"])
        related = {
            citation["key"] for citation in mdic_citations(anchor["context"])
        } & known
        if not related and not re.search(
            r"mover|automotiv|veicul|autopec|homolog|emisso|eficiencia energetica",
            context,
        ):
            continue
        draft = bool(
            re.search(r"minuta|consulta publica|proposta de portaria", context)
        )
        for citation in primary:
            found[citation["key"]] = {
                **citation,
                "url": anchor["url"],
                "originalHref": anchor.get("originalHref", anchor["url"]),
                "linkStatus": anchor.get(
                    "linkStatus", "official_https_reference_not_fetched"
                ),
                "originalAnchorLabel": anchor.get("originalLabel", anchor["label"]),
                "citationLabel": anchor["label"],
                "indexExcerpt": anchor["context"][:600],
                "role": "draft_or_consultation" if draft else "index_reference",
                "relatedKnownCitations": sorted(related - {citation["key"]}),
                "evidenceType": "official_index_not_full_text",
            }
    return [found[key] for key in sorted(found)]


def load_sources(root=ROOT, include_catalog=False):
    rows = []
    for relative in SOURCE_FILES:
        document = json.loads((root / relative).read_text())
        rows += [
            {**row, "registryPath": relative, "registryCheckedAt": row.get("checkedAt")}
            for row in document["records"]
        ]
    manifest = json.loads((root / "data/monitor/sources.json").read_text())
    rows += manifest["additionalSources"]
    overrides = manifest.get("overrides", {})
    for row in rows:
        row["references"] = [
            {"id": row["id"], "kind": "curated_source", "title": row["title"]}
        ]
    if include_catalog:
        index = json.loads((root / "data/process/knowledge-index.json").read_text())
        rows += [
            {
                "id": "catalog-act:" + act["id"],
                "title": act["title"],
                "agency": act["agency"].upper(),
                "url": act["officialUrl"],
                "evidenceType": "published_catalog_reference_not_new_normative_review",
                "references": [
                    {"id": act["id"], "kind": "catalog_act", "title": act["title"]}
                ],
            }
            for act in index["tables"]["acts"]
        ]
    result, urls = [], {}
    for row in rows:
        row = {**row, **overrides.get(row["id"], {})}
        row["url"] = official_url(row["url"])
        if row["url"] in urls:
            urls[row["url"]]["references"].extend(row["references"])
            continue
        urls[row["url"]] = row
        result.append(row)
    ids = [row["id"] for row in result]
    if len(set(ids)) != len(ids):
        raise ValueError("IDs duplicados nas fontes do monitor")
    return sorted(result, key=lambda row: row["id"])


def observe(source, previous, transport, observed_at, known):
    same_url = previous and previous.get("url") == source["url"]
    headers = {}
    compatible_snapshot = (
        same_url and previous.get("normalizationVersion") == NORMALIZATION_VERSION
    )
    if compatible_snapshot:
        if previous.get("etag"):
            headers["If-None-Match"] = previous["etag"]
        if previous.get("lastModified"):
            headers["If-Modified-Since"] = previous["lastModified"]
    observation = {
        "sourceId": source["id"],
        "title": source["title"],
        "agency": source["agency"],
        "url": source["url"],
        "observedAt": observed_at,
        "scope": "technical_content_observation_not_normative_review",
    }
    try:
        result = transport(source["url"], headers)
        official_url(result.url)
        observation.update({"httpStatus": result.status, "finalUrl": result.url})
        if result.body:
            observation["responseSha256"] = digest(result.body)
        if result.status == 304:
            if not same_url or not previous.get("normalizedSha256"):
                raise ValueError("304_without_previous_snapshot")
            if not compatible_snapshot:
                raise ValueError("304_requires_current_normalization_snapshot")
            blocked = unavailable_page(result, ContentParser(), "")
            if blocked:
                raise ValueError(blocked)
            if result.url != previous.get("finalUrl", source["url"]):
                raise ValueError("304_target_changed_requires_full_fetch")
            observation["outcome"] = "not_modified"
            citations = (
                index_citations(source, previous["anchors"], known)
                if "anchors" in previous
                else previous.get("citations", [])
            )
            return observation, None, citations
        if result.status != 200:
            raise ValueError(f"http_{result.status}")
        content = canonical_content(result, source)
        citations = index_citations(source, content["anchors"], known)
        updated = {
            "url": source["url"],
            "finalUrl": result.url,
            "normalizedSha256": content["normalizedSha256"],
            "normalizationVersion": NORMALIZATION_VERSION,
            "documentSha256": digest(result.body),
            "contentKind": content["kind"],
            "observedAt": observed_at,
            "etag": next(
                (v for k, v in result.headers.items() if k.lower() == "etag"), None
            ),
            "lastModified": next(
                (v for k, v in result.headers.items() if k.lower() == "last-modified"),
                None,
            ),
            "text": content["text"],
            "anchors": content["anchors"],
            "citations": citations,
            "officialLinks": sorted({anchor["url"] for anchor in content["anchors"]}),
        }
        outcome = (
            "baseline_created"
            if not same_url
            else "normalization_rebased"
            if not compatible_snapshot
            else "unchanged"
            if previous["normalizedSha256"] == updated["normalizedSha256"]
            else "changed"
        )
        observation.update(
            {
                "outcome": outcome,
                "normalizedSha256": updated["normalizedSha256"],
                "documentSha256": updated["documentSha256"],
                "contentKind": updated["contentKind"],
            }
        )
        if outcome == "changed":
            observation["previousNormalizedSha256"] = previous["normalizedSha256"]
            observation["diffExcerpt"] = list(
                difflib.unified_diff(
                    previous.get("text", "").split(". "),
                    content["text"].split(". "),
                    fromfile="previous_observation",
                    tofile="current_observation",
                    lineterm="",
                )
            )[:30]
            old_links = set(previous.get("officialLinks", []))
            observation["addedOfficialLinks"] = sorted(
                set(updated["officialLinks"]) - old_links
            )
            observation["removedOfficialLinks"] = sorted(
                old_links - set(updated["officialLinks"])
            )
        return observation, updated, citations
    except (ValueError, OSError, URLError, TimeoutError) as error:
        observation.update({"outcome": "unavailable", "reason": str(error)[:300]})
        # Failed retrievals never replace the last valid baseline or its citations.
        return observation, None, previous.get("citations", []) if previous else []


def monitor(
    sources,
    state,
    known,
    transport=fetch,
    observed_at=None,
    workers=2,
    candidates=None,
    time_budget=None,
):
    observed_at = observed_at or utc_now()
    updated_state = deepcopy(state)
    updated_state.setdefault("schemaVersion", 1)
    updated_state.setdefault("sources", {})
    updated_state.setdefault("pendingChanges", {})
    updated_state.setdefault("acknowledgedChanges", [])
    previous_sources = state.get("sources", {})
    previous_by_url = {
        snapshot.get("url"): snapshot
        for snapshot in previous_sources.values()
        if snapshot.get("url")
    }
    previous_selected = {
        source["id"]: previous_sources.get(source["id"])
        or previous_by_url.get(source["url"], {})
        for source in sources
    }
    tasks = [(source, previous_selected[source["id"]]) for source in sources]
    deadline = time.monotonic() + time_budget if time_budget else None
    candidates = candidates or {}

    def run(task):
        if deadline is not None and time.monotonic() >= deadline:
            source, previous = task
            return (
                {
                    "sourceId": source["id"],
                    "agency": source["agency"],
                    "title": source["title"],
                    "url": source["url"],
                    "observedAt": observed_at,
                    "outcome": "unavailable",
                    "reason": "not_attempted_time_budget",
                    "scope": "technical_content_observation_not_normative_review",
                },
                None,
                index_citations(source, previous.get("anchors", []), known)
                if previous
                else [],
            )
        return observe(task[0], task[1], transport, observed_at, known)

    with ThreadPoolExecutor(max_workers=max(1, min(workers, 4))) as pool:
        results = list(pool.map(run, tasks))
    observations, inventory_gaps, drafts = [], [], []
    for source, (observation, accepted, citations) in zip(sources, results):
        observation["references"] = source.get("references", [])
        observations.append(observation)
        if accepted is not None:
            updated_state["sources"][source["id"]] = accepted
        if observation["outcome"] == "changed":
            identity = source["id"] + ":" + observation["normalizedSha256"][:16]
            updated_state["pendingChanges"].setdefault(
                identity,
                {
                    **observation,
                    "id": identity,
                    "status": "pending_normative_review",
                    "firstObservedAt": observed_at,
                },
            )
        snapshot = accepted or previous_selected.get(source["id"], {})
        for citation in citations:
            if citation["key"] in known:
                continue
            candidate = {
                **citation,
                "sourceId": source["id"],
                "sourceUrl": source["url"],
                "sourceObservationAt": snapshot.get("observedAt"),
                "currentRetrievalOutcome": observation["outcome"],
                "status": "pending_inventory_reconciliation",
                "legalStatus": None,
                "reviewStatus": "index_reference_only",
            }
            if citation["key"] in candidates:
                candidate["status"] = "registered_candidate_review_pending"
                candidate["editorialCandidate"] = candidates[citation["key"]]
            (
                drafts
                if citation["role"] == "draft_or_consultation"
                else inventory_gaps
            ).append(candidate)

    def merge_citations(rows):
        by_key = {}
        for row in rows:
            evidence = {
                key: row[key]
                for key in (
                    "sourceId",
                    "sourceUrl",
                    "sourceObservationAt",
                    "currentRetrievalOutcome",
                    "originalHref",
                )
                if key in row
            }
            if row["key"] not in by_key:
                by_key[row["key"]] = {**row, "sourceEvidence": []}
            by_key[row["key"]]["sourceEvidence"].append(evidence)
        return [by_key[key] for key in sorted(by_key)]

    inventory_gaps = merge_citations(inventory_gaps)
    drafts = merge_citations(drafts)
    unavailable = sum(row["outcome"] == "unavailable" for row in observations)
    catalog_ids = {
        ref["id"]
        for source in sources
        for ref in source.get("references", [])
        if ref["kind"] == "catalog_act"
    }
    available_catalog_ids = {
        ref["id"]
        for row in observations
        if row["outcome"] != "unavailable"
        for ref in row.get("references", [])
        if ref["kind"] == "catalog_act"
    }
    pending = list(updated_state["pendingChanges"].values())
    status = (
        "partial_observation"
        if unavailable
        else "review_required"
        if pending or inventory_gaps
        else "observed_no_change"
    )
    report = {
        "schemaVersion": 1,
        "kind": "official_source_observation_and_inventory_reconciliation",
        "observedAt": observed_at,
        "status": status,
        "scopeNote": "Observação técnica das fontes curadas. Não consolida todo o arcabouço, não comprova vigência ou aplicabilidade e não altera o catálogo.",
        "requestDeduplicationNote": "Referências compartilham uma requisição quando têm a mesma URL. Isso não comprova identidade do ato, íntegra disponível ou revisão de cada referência.",
        "counts": {
            "sources": len(sources),
            "available": len(sources) - unavailable,
            "unavailable": unavailable,
            "notAttempted": sum(
                row.get("reason") == "not_attempted_time_budget" for row in observations
            ),
            "catalogActsSelected": len(catalog_ids),
            "catalogActSourceUrlsAvailable": len(available_catalog_ids),
            "changedThisRun": sum(row["outcome"] == "changed" for row in observations),
            "pendingContentReviews": len(pending),
            "missingInventoryCitations": sum(
                row["status"] == "pending_inventory_reconciliation"
                for row in inventory_gaps
            ),
            "registeredCandidateReviews": sum(
                row["status"] == "registered_candidate_review_pending"
                for row in inventory_gaps
            ),
            "draftOrConsultationCandidates": len(drafts),
        },
        "observations": observations,
        "pendingContentReviews": pending,
        "inventoryCandidates": inventory_gaps,
        "draftOrConsultationCandidates": drafts,
    }
    return report, updated_state


def acknowledge(state, identities, review_reference, observed_at):
    if identities and not review_reference.strip():
        raise ValueError(
            "Registrar referência da revisão antes de reconhecer candidatas"
        )
    for identity in identities:
        pending = state.get("pendingChanges", {})
        if identity not in pending:
            raise ValueError("Candidata pendente desconhecida: " + identity)
        candidate = pending.pop(identity)
        state.setdefault("acknowledgedChanges", []).append(
            {
                "id": identity,
                "sourceId": candidate["sourceId"],
                "reviewReference": review_reference.strip(),
                "acknowledgedAt": observed_at,
            }
        )


def safe_output(path):
    path = Path(path).resolve()
    artifact_root = ROOT / "tests/artifacts"
    inside_repo = path == ROOT or ROOT in path.parents
    ignored_artifact = path == artifact_root or artifact_root in path.parents
    if inside_repo and not ignored_artifact:
        raise ValueError(
            "Estado do monitor deve ficar fora de dados, fontes e artefato publicado"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def write_json(path, value):
    path = safe_output(path)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    )
    temporary.replace(path)


def summary(report):
    counts = report["counts"]
    lines = [
        "# Monitor de fontes regulatórias",
        "",
        f"Observação técnica: {report['observedAt']}. Estado: **{report['status']}**.",
        "",
        f"URLs selecionadas: {counts['sources']}; atos cadastrados selecionados: {counts['catalogActsSelected']}; indisponíveis: {counts['unavailable']}; não iniciadas por orçamento: {counts['notAttempted']}; revisões de conteúdo pendentes: {counts['pendingContentReviews']}; citações ausentes do inventário: {counts['missingInventoryCitations']}; candidatas cadastradas ainda pendentes: {counts['registeredCandidateReviews']}.",
        "",
        "HTTP 200, hash inalterado ou 304 não comprovam revisão jurídica nem cobertura integral.",
        "",
        "| Fonte | Resultado |",
        "| --- | --- |",
    ]
    for row in report["observations"]:
        title = row["sourceId"].replace("|", " ").replace("\n", " ")
        result = row.get("reason", row["outcome"]).replace("|", " ").replace("\n", " ")
        lines.append(f"| {title} | {result} |")
    if report["inventoryCandidates"]:
        lines += ["", "## Citações para conciliar com o inventário", ""]
        for item in report["inventoryCandidates"]:
            lines.append(
                f"- `{item['key']}` — {item['status']}; referência de índice, íntegra e cadeia pendentes."
            )
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", default="/tmp/regulatory-monitor/state.json")
    parser.add_argument("--report", default="/tmp/regulatory-monitor/report.json")
    parser.add_argument("--summary", default="/tmp/regulatory-monitor/summary.md")
    parser.add_argument(
        "--snapshot-dir",
        help="Optional raw response .bin snapshots outside the repository",
    )
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument(
        "--include-catalog",
        action="store_true",
        help="Include all published catalog act URLs, preserving identities while deduplicating requests",
    )
    parser.add_argument(
        "--time-budget",
        type=int,
        default=600,
        help="Seconds to start requests; unfinished scope stays explicitly unobserved",
    )
    parser.add_argument("--snapshot-budget-mib", type=int, default=20)
    parser.add_argument("--source-id", action="append", default=[])
    parser.add_argument("--acknowledge", action="append", default=[])
    parser.add_argument("--review-reference", default="")
    parser.add_argument("--acknowledge-from-env", action="store_true")
    args = parser.parse_args()
    state_path = safe_output(args.state)
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    if state and state.get("schemaVersion") != 1:
        parser.error("Versão de estado não suportada")
    observed_at = utc_now()
    identities = args.acknowledge
    reference = args.review_reference
    if args.acknowledge_from_env:
        identities += [
            value.strip()
            for value in os.getenv("ACKNOWLEDGE_CANDIDATES", "").split(",")
            if value.strip()
        ]
        reference = os.getenv("REVIEW_REFERENCE", reference)
    acknowledge(state, identities, reference, observed_at)
    if not 1 <= args.time_budget <= 1200 or not 0 <= args.snapshot_budget_mib <= 100:
        parser.error(
            "Usar orçamento de tempo entre 1 e 1200s e snapshots entre 0 e 100MiB"
        )
    sources = load_sources(include_catalog=args.include_catalog)
    configured_count = len(sources)
    if args.source_id:
        missing = set(args.source_id) - {
            identity
            for source in sources
            for identity in [
                source["id"],
                *[ref["id"] for ref in source.get("references", [])],
            ]
        }
        if missing:
            parser.error("Fontes desconhecidas: " + ", ".join(sorted(missing)))
        sources = [
            source
            for source in sources
            if set(args.source_id)
            & {source["id"], *[ref["id"] for ref in source.get("references", [])]}
        ]

    snapshot_lock = threading.Lock()
    snapshots = {
        "saved": 0,
        "bytes": 0,
        "skippedForBudget": 0,
        "budgetBytes": args.snapshot_budget_mib * 1024 * 1024,
    }

    def transport(url, headers):
        result = fetch(url, headers)
        if args.snapshot_dir and result.body:
            snapshot = safe_output(
                Path(args.snapshot_dir) / (digest(result.body) + ".bin")
            )
            with snapshot_lock:
                if not snapshot.exists():
                    if (
                        snapshots["bytes"] + len(result.body)
                        <= snapshots["budgetBytes"]
                    ):
                        snapshot.write_bytes(result.body)
                        snapshots["saved"] += 1
                        snapshots["bytes"] += len(result.body)
                    else:
                        snapshots["skippedForBudget"] += 1
        return result

    report, state = monitor(
        sources,
        state,
        known_citations(),
        transport=transport,
        observed_at=observed_at,
        workers=args.workers,
        candidates=registered_candidates(),
        time_budget=args.time_budget,
    )
    report["rawSnapshots"] = snapshots
    report["sourceSelection"] = {
        "mode": "filtered" if args.source_id else "all_configured",
        "configuredSources": configured_count,
        "selectedSources": len(sources),
        "includePublishedCatalog": args.include_catalog,
    }
    write_json(args.state, state)
    write_json(args.report, report)
    safe_output(args.summary).write_text(summary(report))
    print(
        json.dumps({"status": report["status"], **report["counts"]}, ensure_ascii=False)
    )
    return (
        2
        if report["counts"]["unavailable"]
        else 3
        if report["status"] == "review_required"
        else 0
    )


if __name__ == "__main__":
    raise SystemExit(main())
