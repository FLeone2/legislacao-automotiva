"""Conferências da fase E0: contas que verificam a folha Ballard FCgen-1020ACS.

Cada função recebe e devolve grandezas com unidade (pint). Os valores de
entrada vêm de SPC5103429-0E (Ballard, 31/10/2019), salvo indicação.

Convenção de "slpm": a própria Ballard define, no glossário da SPC5103429-0E
(p. 5), litro padrão por minuto a 1 atm e 0 °C. Usar 20 °C ou 25 °C mudaria
o volume molar em 7 % a 9 % e criaria uma falsa discrepância.
"""

from __future__ import annotations

import numpy as np
import pint

ureg = pint.UnitRegistry()
Q_ = ureg.Quantity

# Constantes físicas (CODATA 2018 e IUPAC); tag [L].
F = Q_(96485.33212, "C/mol")  # constante de Faraday
R = Q_(8.314462618, "J/(mol*K)")  # constante dos gases
M_H2 = Q_(2.01588, "g/mol")  # massa molar do H2
M_AR = Q_(28.965, "g/mol")  # massa molar do ar seco
X_O2_AR = 0.2095  # fração molar de O2 no ar seco

# Entalpias de formação da água a 25 °C (NIST); tag [L].
DH_HHV = Q_(285.83, "kJ/mol")  # água líquida (poder calorífico superior)
DH_LHV = Q_(241.83, "kJ/mol")  # vapor d'água (poder calorífico inferior)

# Condição padrão Ballard para slpm (SPC5103429-0E, p. 5): 1 atm e 0 °C.
P_PADRAO = Q_(101325, "Pa")
T_PADRAO = Q_(273.15, "K")


def volume_molar_padrao(T=T_PADRAO, P=P_PADRAO):
    """Volume molar de gás ideal V_m = R·T/P, em L/mol."""
    return (R * T / P).to("L/mol")


def h2_por_carga(n_celulas: int):
    """Massa de H2 consumida por ampère-hora de corrente do stack.

    Lei de Faraday: cada mol de H2 entrega 2 mol de elétrons. Em série, a
    mesma corrente atravessa todas as células, então o consumo multiplica
    pelo número de células.
    """
    return (n_celulas * M_H2 / (2 * F)).to("g/(A*h)")


def carga_por_h2(n_celulas: int):
    """Inverso de h2_por_carga: ampère-hora de corrente do stack por kg de H2."""
    return (1 / h2_por_carga(n_celulas)).to("A*h/kg")


def vazao_h2_estequiometrica(corrente, lam: float = 1.0):
    """Vazão de H2 por célula, em slpm (0 °C, 1 atm), para estequiometria lam."""
    n_dot = lam * corrente / (2 * F)
    return (n_dot * volume_molar_padrao()).to("L/min")


def vazao_ar_estequiometrica(corrente, lam: float = 1.0):
    """Vazão de ar seco por célula, em slpm (0 °C, 1 atm), para estequiometria lam.

    O2: 4 elétrons por mol, então n_O2 = I/(4F); ar = n_O2 / x_O2.
    """
    n_dot_ar = lam * corrente / (4 * F) / X_O2_AR
    return (n_dot_ar * volume_molar_padrao()).to("L/min")


def estequiometria_ar_da_vazao(vazao_por_celula, corrente):
    """Estequiometria de ar implícita numa vazão por célula (slpm)."""
    return (vazao_por_celula / vazao_ar_estequiometrica(corrente)).to("").magnitude


def tensao_termoneutra(dh):
    """Tensão equivalente à entalpia: E = ΔH/(2F)."""
    return (dh / (2 * F)).to("V")


def eficiencia_tensao(v_celula, base: str = "HHV"):
    """Eficiência de tensão da célula, V_cell / E_ΔH, na base HHV ou LHV.

    Não inclui a utilização de combustível (purga e vazamento).
    """
    dh = {"HHV": DH_HHV, "LHV": DH_LHV}[base]
    return (v_celula / tensao_termoneutra(dh)).to("").magnitude


def potencia_stack(n_celulas: int, v_celula, corrente):
    """Potência elétrica bruta do stack: P = N·V_cell·I."""
    return (n_celulas * v_celula * corrente).to("W")


def calor_gerado(n_celulas: int, v_celula, corrente, base: str = "HHV"):
    """Calor gerado no stack: Q = N·I·(E_ΔH − V_cell)."""
    dh = {"HHV": DH_HHV, "LHV": DH_LHV}[base]
    return (n_celulas * corrente * (tensao_termoneutra(dh) - v_celula)).to("W")


def elevacao_temperatura_ar(calor_por_celula, vazao_por_celula, cp=Q_(1006, "J/(kg*K)")):
    """Elevação de temperatura do ar de resfriamento: ΔT = Q / (ṁ·cp)."""
    m_dot = (vazao_por_celula / volume_molar_padrao() * M_AR).to("kg/s")
    return (calor_por_celula / (m_dot * cp)).to("K")


def intervalo_purga_implicito(volume_purga_por_celula, lam: float):
    """Carga (A·s) entre purgas que torna a estequiometria média igual a lam.

    Em operação sem saída (dead-ended), o H2 em excesso sai só na purga.
    Por célula: excesso = (lam − 1)·I·t/(2F) = V_purga/V_m  →  I·t = ...
    """
    n_purga = (volume_purga_por_celula / volume_molar_padrao()).to("mol")
    return (n_purga * 2 * F / (lam - 1)).to("A*s")


def massa_h2_de_vazao(vazao):
    """Converte vazão em slpm (0 °C, 1 atm) para vazão mássica de H2."""
    return (vazao / volume_molar_padrao() * M_H2).to("g/h")


def ajuste_linear(x, y):
    """Mínimos quadrados y = a·x + b; devolve (a, b, R²)."""
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    a, b = np.polyfit(x, y, 1)
    residuo = y - (a * x + b)
    r2 = 1 - np.sum(residuo**2) / np.sum((y - y.mean()) ** 2)
    return float(a), float(b), float(r2)


# Tabelas 2 e 3 da SPC5103429-0E (p. 6), início de vida (BOL); tag [DF].
CORRENTE_TABELA_A = [0.0, 7.3, 14.5, 29.0, 51.7, 65.3, 75.0]
V_MINIMA_V = [0.93, 0.80, 0.77, 0.73, 0.67, 0.63, 0.59]
P_MINIMA_W = [0.0, 5.8, 11.2, 21.2, 34.6, 41.1, 44.1]
V_TIPICA_V = [0.99, 0.83, 0.80, 0.76, 0.70, 0.66, 0.62]
P_TIPICA_W = [0.0, 6.1, 11.6, 22.0, 36.2, 43.1, 46.5]
T_RECOMENDADA_C = [26, 30, 34, 41, 53, 61, 66]


if __name__ == "__main__":
    n = 56
    i_nom = Q_(65.3, "A")
    print(f"Vm padrão Ballard: {volume_molar_padrao():.4f~P}")
    print(f"(a) H2 por Ah, 1 célula: {h2_por_carga(1):.5f~P}; 56 células: {h2_por_carga(n):.4f~P}")
    print(f"(a) Ah por kg, 1 célula: {carga_por_h2(1):.0f~P}; 56 células: {carga_por_h2(n):.1f~P}")
    print(f"(b) H2 a 65,3 A, λ=1: {vazao_h2_estequiometrica(i_nom):.4f~P} por célula")
    print(f"(b) H2 a 65,3 A, λ=1,07: {vazao_h2_estequiometrica(i_nom, 1.07):.4f~P} por célula")
    print(f"(b) com Vm a 20 °C: {(vazao_h2_estequiometrica(i_nom) * 293.15 / 273.15):.4f~P}")
    print(f"(c) ar a 65,3 A, λ=1: {vazao_ar_estequiometrica(i_nom):.4f~P} por célula")
    print(f"(c) λ implícito em 50 slpm/célula: {estequiometria_ar_da_vazao(Q_(50, 'L/min'), i_nom):.1f}")
    print(f"(c) vazão no λ mínimo 20: {vazao_ar_estequiometrica(i_nom, 20):.2f~P} por célula")
    print(f"(c) 56 células a 50 slpm: {(n * Q_(50, 'L/min')).to('m**3/h'):.1f~P} (normal)")
    for base in ("HHV", "LHV"):
        print(f"(e) E_{base} = {tensao_termoneutra(DH_HHV if base == 'HHV' else DH_LHV):.4f~P}; "
              f"η a 0,66 V = {eficiencia_tensao(Q_(0.66, 'V'), base):.4f}; "
              f"a 0,63 V = {eficiencia_tensao(Q_(0.63, 'V'), base):.4f}")
    print(f"Potência 56 × 0,63 V × 65,3 A = {potencia_stack(n, Q_(0.63, 'V'), i_nom):.1f~P}")
    print(f"Potência 56 × 0,66 V × 65,3 A = {potencia_stack(n, Q_(0.66, 'V'), i_nom):.1f~P}")
    print(f"Potência 56 × 41,1 W = {56 * 41.1:.1f} W; 56 × 43,1 W = {56 * 43.1:.1f} W")
    for base in ("HHV", "LHV"):
        q = calor_gerado(1, Q_(0.66, "V"), i_nom, base)
        print(f"Calor por célula ({base}) a 0,66 V: {q:.2f~P}; ΔT do ar a 50 slpm: "
              f"{elevacao_temperatura_ar(q, Q_(50, 'L/min')):.1f~P}")
    it = intervalo_purga_implicito(Q_(20, "cm**3"), 1.07)
    print(f"Purga 20 cc/célula com λ=1,07: a cada {it:.0f~P} ({(it / i_nom).to('s'):.1f~P} a 65,3 A)")
    print(f"H2 por purga, 56 células: {(n * Q_(20, 'cm**3') / volume_molar_padrao() * M_H2).to('g'):.4f~P}")
    for q_vaz, rotulo in ((5, "BOL"), (12, "1500 h e 1000 ciclos")):
        m = massa_h2_de_vazao(n * Q_(q_vaz, "cm**3/min"))
        consumo = (h2_por_carga(n) * i_nom).to("g/h")
        print(f"Vazamento externo {rotulo}: {m:.2f~P} = {(m / consumo).to('percent'):.2f~P} do consumo a 65,3 A")
    a, b, r2 = ajuste_linear(CORRENTE_TABELA_A, T_RECOMENDADA_C)
    print(f"T_rec = {a:.4f}·I + {b:.3f} °C (R² = {r2:.5f})")
    for v, p, i in zip(V_TIPICA_V, P_TIPICA_W, CORRENTE_TABELA_A):
        print(f"  I={i:5.1f} A  V·I típico = {v * i:6.2f} W  tabela = {p:5.1f} W")
