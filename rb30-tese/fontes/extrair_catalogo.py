"""Gera dados/catalogo_pecas.csv a partir do PDF do catálogo RB30-S4 PLUS.

Por que OCR: a camada de texto do PDF usa uma fonte Type 3 com codificação
própria ("cópia controlada"), e o pdftotext devolve símbolos sem sentido.

Passos:
1. pdftoppm renderiza cada página a 300 dpi;
2. o Tesseract (idioma por) lê a tabela da esquerda de cada página;
3. a linha "00" (conjunto) e o código EV9 de cada página foram lidos na imagem,
   porque o OCR corta a primeira linha; estão em CABECALHOS;
4. CORRECOES troca leituras erradas do OCR, cada uma conferida na imagem
   ampliada (registro em fontes/RB30_indice.md).

Uso (precisa de pdftoppm e tesseract no sistema):
    .venv/bin/python fontes/extrair_catalogo.py
"""

from __future__ import annotations

import csv
import re
import subprocess
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
PDF = RAIZ / "fontes" / "catalogo_RB30-S4PLUS_1185669.pdf"
SAIDA = RAIZ / "dados" / "catalogo_pecas.csv"

# página do PDF: (página impressa, código EV9, código do conjunto, descrição do conjunto)
CABECALHOS = {
    1: (44, "EV9-343", "1147775", "Kit - Cinto de Segurança 2 Pontos Retrátil"),
    2: (45, "EV9-389", "1154162", "Pneu SE/PR 4.00-8 completo"),
    3: (46, "EV9-389", "1182469", "Pneu SE/BR 4.00-8 completo"),
    4: (47, "EV9-455", "1182470", 'Pneu PN 5.00 x 8" completo'),
    5: (48, "EV9-360", "1188606", "Torre da direção completa"),
    6: (49, "EV9-354", "974907", "Motor completo"),
    7: (50, "EV9-361", "1188601", "Mancal do pinhão completo"),
    8: (51, "EV9-457", "1180423", "Kit carregador monofásico 36V/45A - 220V"),
    9: (52, "EV9-370", "1180426", "Kit carregador trifásico 36V/45A - 440V"),
    10: (53, "EV9-370", "1180424", "Kit carregador trifásico 36V/45A - 460V"),
    11: (54, "EV9-372", "687731", "Kit de fechamento de lona com acabamento preto RB30"),
    12: (55, "EV9-352", "1191264", "Kit catálogo e manual RB30-S4 PLUS"),
    13: (56, "EV9-456", "011139", "Pneu montado 5.00-8 roda com 5 furos"),
    14: (57, "EV9-455", "045681", "Pneu montado 3.75-8 roda com 5 furos"),
    15: (58, "EV9-370", "1229936", "Kit carregador trifásico 36V/45A - 220V"),
    16: (59, "EV9-370", "1229938", "Kit carregador trifásico 36V/45A - 380V"),
    17: (60, "EV9-271", "045657", "Kit jogo pneus montados 3.75 e 5.00 rodas com 5 furos"),
    18: (61, "EV9-246", "902387", "Kit conversor de voltagem"),
    19: (62, "EV9-278", "357201", "Kit suporte troca de baterias"),
    20: (63, "EV9-288", "584706", "Adesivo (Trevo Maior)"),
    21: (64, "EV9-458", "1188408", "Cubo da roda completo"),
    22: (65, "EV9-456", "011113", "Kit estepe PN 3,75 - 8 RD 5F"),
    23: (66, "EV9-379", "1180465", "Braço da suspensão prensado"),
    24: (67, "EV9-473", "1201736", "Caçamba completa"),
    25: (68, "EV9-465", "1201410", "Quadro do para-brisa rebitado"),
    26: (69, "EV9-466", "1201320", "Suporte traseiro rebitado"),
    27: (70, "EV9-468", "283465", "Cilindro mestre"),
    28: (71, "EV9-470", "1149165", "Impulsor completo"),
    29: (72, "EV9-460", "1203354", "Sinalizador completo"),
    30: (73, "EV9-461", "1203435", "Mancal do garfo completo"),
    31: (74, "EV9-479", "1210587", "Kit carregador monofásico 36V - 250/400Ah"),
    32: (75, "EV9-509", "001107", "Circuito de potência"),
    33: (76, "EV9-507", "040872", "Protetor das lanternas RB30"),
    34: (77, "EV9-501", "1226002", "Kit botão de emergência RB30"),
    35: (78, "EV9-500", "1226311", "Tampa traseira completa"),
    36: (79, "EV9-499", "1223372", "Kit estepes pneumáticos 3.75 x 8 e 5.00 x 8"),
    37: (80, "EV9-498", "1225959", "Engate simples completo"),
    38: (81, "EV9-372", "1224437", "Kit de fechamento de lona com acabamento branco RB30"),
    39: (82, "EV9-504", "1226210", "Kit banco sem apoio de braço"),
    40: (83, "EV9-496", "1227990", "Kit banco com apoio de braço"),
}

# Leituras erradas do OCR, conferidas na imagem a 300 dpi: errado -> certo.
CORRECOES = {
    "974714": "974774",  # p. 49, armadura do motor
    "892251": "852251",  # p. 75, fusível magnético retardado
    "4371178": "437178",  # p. 72, chave inversora
    "431194": "437194",  # p. 72, capa protetora
    "411588": "477588",  # p. 83, assento com amortecimento
    "6/8722": "678722",  # p. 72, 82, 83, porca Parlock M8
}
CORRECOES_TEXTO = {
    "M10O": "M10",
    "Reibite": "Rebite",
    "Kitestepe": "Kit estepe",
    "Kit-Cinto": "Kit - Cinto",
    " g ": " Ø ",
    " 9": " Ø",
    "(98": "Ø8",
    "1,/5": "1,75",
    "º": '"',
    "”": '"',
    "|": "",
}

LINHA = re.compile(r"^(\d{2})\s+(\S+)\s+(.+?)\s+(\d+)$")


def ocr_tabela(png: Path) -> list[str]:
    from PIL import Image

    im = Image.open(png)
    w, h = im.size
    tab = im.crop((int(w * 0.085), int(h * 0.555), int(w * 0.495), int(h * 0.92)))
    tab = tab.resize((tab.width * 2, tab.height * 2))
    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        tab.save(tmp.name)
        texto = subprocess.run(
            ["tesseract", tmp.name, "-", "-l", "por", "--psm", "6"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
    return [linha.strip() for linha in texto.splitlines() if linha.strip()]


def juntar_continuacoes(linhas: list[str]) -> list[str]:
    """Junta à linha anterior o texto que o OCR quebrou (descrição em 2 linhas)."""
    saida: list[str] = []
    for linha in linhas:
        if linha.startswith("Cópia controlada"):
            break
        if re.match(r"^\d{2}\s", linha) or not saida:
            saida.append(linha)
        else:
            anterior = saida[-1]
            m = re.match(r"^(.*?)(\s+\d+)$", anterior)
            if m:  # insere a continuação antes da quantidade
                saida[-1] = f"{m.group(1)} {linha}{m.group(2)}"
            else:
                saida[-1] = f"{anterior} {linha}"
    return saida


def limpar(texto: str) -> str:
    for errado, certo in CORRECOES_TEXTO.items():
        texto = texto.replace(errado, certo)
    return re.sub(r"\s+", " ", texto).strip()


def extrair() -> list[dict]:
    linhas_csv = []
    with tempfile.TemporaryDirectory() as pasta:
        subprocess.run(["pdftoppm", "-r", "300", "-png", str(PDF), f"{pasta}/pg"], check=True)
        for png in sorted(Path(pasta).glob("pg-*.png")):
            pag_pdf = int(re.search(r"pg-(\d+)", png.name).group(1))
            pag_imp, ev9, cod00, desc00 = CABECALHOS[pag_pdf]
            base = dict(pagina_pdf=pag_pdf, pagina_impressa=pag_imp, desenho=ev9, conjunto=desc00)
            linhas_csv.append(
                dict(base, ref="00", codigo=cod00, descricao=desc00, qtd=1, origem="leitura visual")
            )
            for linha in juntar_continuacoes(ocr_tabela(png)):
                m = LINHA.match(linha)
                if not m or m.group(1) == "00":
                    continue
                ref, codigo, desc, qtd = m.groups()
                origem = "OCR"
                if codigo in CORRECOES:
                    codigo, origem = CORRECOES[codigo], "OCR corrigido na imagem"
                linhas_csv.append(
                    dict(base, ref=ref, codigo=codigo, descricao=limpar(desc), qtd=int(qtd), origem=origem)
                )
    return linhas_csv


def main() -> None:
    linhas = extrair()
    campos = ["pagina_pdf", "pagina_impressa", "desenho", "conjunto", "ref", "codigo", "descricao", "qtd", "origem"]
    with SAIDA.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos, lineterminator="\n")
        w.writeheader()
        w.writerows(linhas)
    print(f"{len(linhas)} linhas em {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
