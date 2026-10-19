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
    record["reviewStatus"] = {
        "state": "reference_only"
        if reference_only
        else "directed_text_review"
        if record.get("documentCheck", {}).get("state") == "extraido"
        else "index_review",
        "fullTextReviewed": record.get("fullTextReviewed"),
        "amendmentChainReviewed": False,
        "reviewedAt": as_of,
        "gaps": record.get("notes", []),
    }
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
