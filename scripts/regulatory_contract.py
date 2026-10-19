"""Independent editorial, legal, review and applicability states.

No new legal conclusion is inferred here. Compatibility fields remain for older
consumers; publication.included only describes the editorial collection.
"""

from copy import deepcopy


def apply_contract(original, agency, as_of):
    record = deepcopy(original)
    reference_only = agency == "inmetro" or record.get("fullTextReviewed") is False
    partial = record.get("status") == "parcialmente_revogada"
    legal_state = (
        "official_current_reference"
        if reference_only
        else "partially_repealed"
        if partial
        else "indicated_current"
    )
    record["schemaVersion"] = 2
    record["legalStatus"] = {
        "state": legal_state,
        "asOf": as_of,
        "basis": "Referência mantida em orientação oficial; vigência integral não confirmada."
        if reference_only
        else "Indicação nas fontes do recorte revisado; não equivale a consolidação integral.",
        "evidence": record.get("statusEvidence", []),
    }
    editorial_review = {
        **deepcopy(record.get("reviewMetadata", {})),
        **deepcopy(record.get("reviewStatus", {})),
    }
    record["reviewStatus"] = {
        "state": "reference_only"
        if reference_only
        else "directed_text_review"
        if record.get("documentCheck", {}).get("state") == "extraido"
        else "index_review",
        "fullTextReviewed": record.get("fullTextReviewed"),
        "amendmentChainReviewed": False,
        "reviewedAt": record.get("reviewedAt", as_of),
        "gaps": record.get("notes", []),
        **editorial_review,
    }
    if record["reviewStatus"]["state"] not in {
        "reference_only",
        "directed_text_review",
        "index_review",
    }:
        raise ValueError("Unknown review state: " + record["id"])
    # A clause or amendment reviewed in isolation never proves consolidation.
    # Editorial review metadata may narrow the scope without promoting the act.
    if reference_only:
        record["reviewStatus"]["fullTextReviewed"] = record.get("fullTextReviewed")
    if record["reviewStatus"]["amendmentChainReviewed"] and not editorial_review.get(
        "chainEvidence"
    ):
        raise ValueError("Complete chain review requires evidence: " + record["id"])
    review = record["reviewStatus"]
    review["summary"] = (
        "Referências e orientações oficiais; íntegra consolidada pendente."
        if reference_only
        else "Trechos e relações identificadas revisados; cadeia integral não certificada."
        if review["state"] == "directed_text_review"
        else "Índice e anotações oficiais consultados; texto e cadeia precisam de conferência."
    )
    if review["amendmentChainReviewed"]:
        review["summary"] = "Cadeia revisada no escopo e nas evidências registrados."
    record["applicability"] = {
        "state": "requires_assessment",
        "vehicleSpecific": False,
        "basis": record.get("classificationBasis", ""),
        "conditions": [
            "Categoria, configuração, datas, combustível, exceções e transições precisam de enquadramento."
        ],
        "phases": record.get("phases", []),
    }
    record["publication"] = {
        "included": True,
        "reason": "included_as_current_official_reference"
        if reference_only
        else "included_in_reviewed_collection",
        "reviewedAt": as_of,
        "policySource": f"data/{agency}/"
        + ("publication-policy.json" if agency == "contran" else "reviewed-map.json"),
    }
    if reference_only:
        record["currentIndication"] = False
        record["status"] = "referencia_oficial_atual"
    return record
