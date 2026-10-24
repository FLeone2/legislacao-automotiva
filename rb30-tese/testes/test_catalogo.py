"""Integridade de dados/catalogo_pecas.csv (gerado por fontes/extrair_catalogo.py).

Os valores esperados foram lidos à mão nas imagens do catálogo (páginas impressas).
"""

import csv
from collections import Counter
from pathlib import Path

ARQUIVO = Path(__file__).resolve().parents[1] / "dados" / "catalogo_pecas.csv"


def _linhas():
    with ARQUIVO.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_quarenta_paginas_impressas_44_a_83():
    paginas = {int(r["pagina_impressa"]) for r in _linhas()}
    assert paginas == set(range(44, 84))


def test_pagina_pdf_e_impressa_menos_43():
    for r in _linhas():
        assert int(r["pagina_pdf"]) == int(r["pagina_impressa"]) - 43


def test_codigos_numericos_e_quantidades_positivas():
    for r in _linhas():
        assert r["codigo"].isdigit(), r
        assert int(r["qtd"]) >= 1, r


def test_cada_pagina_tem_linha_00():
    contagem = Counter(r["pagina_impressa"] for r in _linhas() if r["ref"] == "00")
    assert set(contagem.values()) == {1} and len(contagem) == 40


def test_itens_conferidos_a_mao():
    # (página impressa, ref, código) lidos na imagem a 300 dpi
    esperados = {
        ("49", "01", "974774"),  # armadura do motor (OCR leu 974714)
        ("61", "05", "956672"),  # conversor DC/DC 36/12 nacional
        ("62", "00", "357201"),  # kit suporte troca de baterias
        ("58", "01", "1229939"),  # carregador trifásico 220 V
        ("59", "01", "1229940"),  # carregador trifásico 380 V
        ("75", "13", "852251"),  # fusível magnético retardado (OCR leu 892251)
        ("74", "03", "017251"),  # contato para conector Anderson 175 A
    }
    obtidos = {(r["pagina_impressa"], r["ref"], r["codigo"]) for r in _linhas()}
    assert esperados <= obtidos


def test_contagem_por_pagina_amostra():
    # número de linhas (incluindo a 00) contado nas imagens
    contagem = Counter(r["pagina_impressa"] for r in _linhas())
    assert contagem["49"] == 17 and contagem["62"] == 12 and contagem["75"] == 18
