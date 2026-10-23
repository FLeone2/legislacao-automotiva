"""Regras de rigor aplicadas a dados/parametros.yaml.

Estes testes não conferem a física. Eles impedem que entre no arquivo um número
sem unidade, sem fonte ou sem tag, e conferem os parâmetros calculados [C].
"""

from pathlib import Path

import pytest
import yaml

from celula.conferencias_e0 import ureg

ARQUIVO = Path(__file__).resolve().parents[1] / "dados" / "parametros.yaml"
TAGS = {"M", "DF", "L", "C", "E", "H", "?"}
CAMPOS = {"valor", "unidade", "condicao", "fonte", "tag"}


def _parametros():
    dados = yaml.safe_load(ARQUIVO.read_text(encoding="utf-8"))
    for grupo, itens in dados.items():
        for nome, p in itens.items():
            yield f"{grupo}.{nome}", p


@pytest.mark.parametrize("nome,p", list(_parametros()))
def test_campos_obrigatorios_e_tag(nome, p):
    assert CAMPOS <= set(p), f"{nome}: faltam {CAMPOS - set(p)}"
    assert p["tag"] in TAGS, f"{nome}: tag {p['tag']!r} inválida"
    assert str(p["fonte"]).strip(), f"{nome}: fonte vazia"


@pytest.mark.parametrize("nome,p", list(_parametros()))
def test_unidade_entendida_pelo_pint(nome, p):
    if isinstance(p["valor"], (int, float)) and p["unidade"]:
        ureg.Quantity(p["valor"], p["unidade"])  # levanta erro se a unidade for inválida


@pytest.mark.parametrize("nome,p", list(_parametros()))
def test_calculado_tem_formula_e_dado_nao_verificado_esta_marcado(nome, p):
    if p["tag"] == "C":
        assert p.get("formula"), f"{nome}: parâmetro [C] sem fórmula"
    if p["tag"] == "DF":
        assert "verificado_no_pdf" in p, f"{nome}: [DF] sem verificado_no_pdf"


def test_energia_bateria_original():
    # 36 V × 252 Ah = 9 072 Wh; 9 072 / 350 = 25,92 Wh/kg; 9 072 / 408 = 22,24 Wh/kg
    d = yaml.safe_load(ARQUIVO.read_text(encoding="utf-8"))["bateria_original"]
    e = ureg.Quantity(d["tensao_nominal"]["valor"], "V") * ureg.Quantity(
        d["capacidade_nominal"]["valor"], "A*h"
    )
    assert e.to("kW*h").magnitude == pytest.approx(d["energia_nominal"]["valor"], rel=1e-4)
    for marca in ("saturnia", "moura"):
        esp = (e / ureg.Quantity(d[f"massa_{marca}"]["valor"], "kg")).to("W*h/kg")
        assert esp.magnitude == pytest.approx(d[f"energia_especifica_{marca}"]["valor"], abs=0.01)


def test_potencias_do_stack():
    d = yaml.safe_load(ARQUIVO.read_text(encoding="utf-8"))["stack"]
    n = d["n_celulas"]["valor"]
    assert n * 41.1 == pytest.approx(d["potencia_nominal_minima"]["valor"])
    assert n * 43.1 == pytest.approx(d["potencia_nominal_tipica"]["valor"])
