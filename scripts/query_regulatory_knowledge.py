#!/usr/bin/env python3
"""Read-only lexical retrieval with citations, review states and explicit limits."""

import argparse
import json
import re
import sqlite3
from pathlib import Path


def connect(path):
    path = Path(path).resolve()
    if not path.is_file():
        raise ValueError(
            "SQLite not found; export it with build_regulatory_knowledge.py --sqlite"
        )
    connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only=ON")
    return connection


def metadata(connection):
    return {
        row["key"]: json.loads(row["value_json"])
        for row in connection.execute("SELECT key,value_json FROM metadata")
    }


def lexical_query(value):
    # Input is text, not an FTS expression or SQL. Quoting every token makes
    # operator-like words, punctuation and quotes ordinary searchable content.
    words = re.findall(r"[^\W_]+", value, re.UNICODE)
    if not words:
        raise ValueError("Enter searchable words or an exact act ID")
    if len(words) > 30:
        raise ValueError("Use at most 30 search terms")
    return " AND ".join('"' + word.replace('"', '""') + '"' for word in words)


def qualify(row, revision, score=None, mode="lexical_fts5"):
    chunk = json.loads(row["record_json"])
    review = chunk.get("reviewStatus") or {}
    return {
        "id": chunk["id"],
        "actId": chunk["actId"],
        "sourceId": chunk.get("sourceId"),
        "candidateId": chunk.get("candidateId"),
        "role": chunk.get("role")
        or (
            "source"
            if chunk.get("actId") is None
            else "requirement"
            if chunk.get("requirementId")
            else "consultation_act"
        ),
        "requirementId": chunk["requirementId"],
        "title": chunk["title"],
        "text": chunk["text"],
        "citation": {
            **chunk["citation"],
            "actRevision": chunk["actRevision"],
            "sourceRevision": chunk.get("sourceRevision"),
            "candidateRevision": chunk.get("candidateRevision"),
            "knowledgeRevision": revision,
            "markdownPath": chunk["markdownPath"],
        },
        "evidenceAssessment": {
            "recordKind": chunk["kind"],
            "evidenceType": chunk["citation"]["evidenceType"],
            "reviewState": review.get("state"),
            "fullTextReviewed": review.get("fullTextReviewed"),
            "amendmentChainReviewed": review.get("amendmentChainReviewed"),
            "reviewDate": chunk.get("reviewDate"),
            "checkedAt": chunk.get("checkedAt"),
            "fullTextIncluded": False,
            "automaticApplicability": False,
        },
        "legalStatus": chunk.get("legalStatus"),
        "reviewStatus": chunk.get("reviewStatus"),
        "applicability": chunk.get("applicability"),
        "publication": chunk.get("publication"),
        "verificationPlan": chunk.get("verificationPlan"),
        "context": chunk.get("context"),
        "sourceMetadata": chunk.get("sourceMetadata"),
        "sourceIdentityLinks": chunk.get("sourceIdentityLinks", []),
        "relatedCandidates": chunk.get("relatedCandidates", []),
        "candidateSource": chunk.get("candidateSource"),
        "relationships": chunk.get("relationships", []),
        "sourceContextLinks": chunk.get("sourceContextLinks", []),
        "recordedRelationIds": chunk.get("recordedRelationIds", []),
        "limitations": chunk["limitations"],
        "retrieval": {
            "kind": mode,
            "score": score,
            "scoreIsLegalConfidence": False,
        },
    }


def query(
    connection, text=None, act_id=None, source_id=None, candidate_id=None, limit=10
):
    if not isinstance(limit, int) or not 1 <= limit <= 50:
        raise ValueError("Limit must be between 1 and 50")
    if sum(bool(value) for value in (text, act_id, source_id, candidate_id)) != 1:
        raise ValueError("Choose search text, an act ID, a source ID or a candidate ID")
    info = metadata(connection)
    if act_id:
        found = connection.execute(
            "SELECT act_id FROM aliases WHERE alias=?", (act_id,)
        ).fetchone()
        canonical = found["act_id"] if found else act_id
        total = connection.execute(
            "SELECT count(*) FROM chunks WHERE act_id=?", (canonical,)
        ).fetchone()[0]
        rows = connection.execute(
            "SELECT record_json FROM chunks WHERE act_id=? ORDER BY requirement_id IS NULL DESC,id LIMIT ?",
            (canonical, limit),
        ).fetchall()
        results = [qualify(row, info["revision"], mode="exact_act_id") for row in rows]
    elif source_id:
        total = connection.execute(
            "SELECT count(*) FROM chunks WHERE source_id=?", (source_id,)
        ).fetchone()[0]
        rows = connection.execute(
            "SELECT record_json FROM chunks WHERE source_id=? ORDER BY id LIMIT ?",
            (source_id, limit),
        ).fetchall()
        results = [
            qualify(row, info["revision"], mode="exact_source_id") for row in rows
        ]
    elif candidate_id:
        total = connection.execute(
            "SELECT count(*) FROM chunks WHERE candidate_id=?", (candidate_id,)
        ).fetchone()[0]
        rows = connection.execute(
            "SELECT record_json FROM chunks WHERE candidate_id=? ORDER BY id LIMIT ?",
            (candidate_id, limit),
        ).fetchall()
        results = [
            qualify(row, info["revision"], mode="exact_candidate_id") for row in rows
        ]
    else:
        expression = lexical_query(text)
        total = connection.execute(
            "SELECT count(*) FROM chunk_fts WHERE chunk_fts MATCH ?", (expression,)
        ).fetchone()[0]
        rows = connection.execute(
            "SELECT c.record_json,bm25(chunk_fts) AS score FROM chunk_fts "
            "JOIN chunks AS c ON c.id=chunk_fts.id WHERE chunk_fts MATCH ? "
            "ORDER BY score,c.id LIMIT ?",
            (expression, limit),
        ).fetchall()
        results = [qualify(row, info["revision"], row["score"]) for row in rows]
    act_contexts = {}
    for result in results:
        identity = result["actId"]
        if identity:
            if identity not in act_contexts:
                stored = connection.execute(
                    "SELECT record_json FROM acts WHERE id=?", (identity,)
                ).fetchone()
                act_contexts[identity] = json.loads(stored["record_json"])
            card = act_contexts[identity]
            result["sourceContextLinks"] = card.get("sourceContextLinks", [])
            result["recordedRelations"] = card.get("recordedRelations", [])
            result["temporalFlags"] = card.get("temporalFlags", [])
    related = {
        notice["candidateId"]: notice
        for result in results
        for notice in result["relatedCandidates"]
    }
    warnings = []
    if related:
        warnings.append(
            "O ato consultado possui candidato modificador pendente. Revisar índice, íntegra e cadeia antes de concluir sobre a redação aplicável."
        )
    if any(result["role"] == "candidate" for result in results):
        warnings.append(
            "Resultados com papel candidate estão fora do catálogo publicado e não constituem obrigação ou efeito formal confirmado."
        )
    return {
        "knowledgeRevision": info["revision"],
        "scopeNote": info["scopeNote"],
        "query": {
            "text": text,
            "actId": act_id,
            "sourceId": source_id,
            "candidateId": candidate_id,
            "limit": limit,
        },
        "count": len(results),
        "totalMatches": total,
        "truncated": total > len(results),
        "results": results,
        "relatedCandidates": [related[key] for key in sorted(related)],
        "warnings": warnings,
        "answerPolicy": "Citar dispositivo, fonte, data e revisão. Ausência de resultado não prova ausência de obrigação. Recuperação lexical não decide aplicabilidade nem confiança jurídica.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--query")
    group.add_argument("--act")
    group.add_argument("--source")
    group.add_argument("--candidate")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    connection = connect(args.database)
    try:
        result = query(
            connection,
            text=args.query,
            act_id=args.act,
            source_id=args.source,
            candidate_id=args.candidate,
            limit=args.limit,
        )
    finally:
        connection.close()
    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
