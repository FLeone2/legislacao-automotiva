"""Testes das conferências E0. Cada valor de referência foi calculado à mão.

As contas à mão estão escritas no comentário de cada teste, na mesma ordem
em que aparecem na aula 00 (aulas/00_ficha_celula.md).
"""

import pytest

from celula.conferencias_e0 import (
    CORRENTE_TABELA_A,
    P_TIPICA_W,
    Q_,
    T_RECOMENDADA_C,
    V_TIPICA_V,
    ajuste_linear,
    calor_gerado,
    carga_por_h2,
    elevacao_temperatura_ar,
    eficiencia_tensao,
    estequiometria_ar_da_vazao,
    h2_por_carga,
    intervalo_purga_implicito,
    massa_h2_de_vazao,
    potencia_stack,
    tensao_termoneutra,
    vazao_ar_estequiometrica,
    vazao_h2_estequiometrica,
    volume_molar_padrao,
    DH_HHV,
    DH_LHV,
)

I_NOM = Q_(65.3, "A")


def test_volume_molar_padrao_0C_1atm():
    # 8,314462618 × 273,15 / 101325 = 0,0224140 m³/mol = 22,4140 L/mol
    assert volume_molar_padrao().to("L/mol").magnitude == pytest.approx(22.4140, abs=1e-4)


def test_h2_por_ah_uma_celula():
    # 2,01588 g/mol / (2 × 96485,33 C/mol) × 3600 C/Ah = 0,037609 g/Ah
    assert h2_por_carga(1).to("g/(A*h)").magnitude == pytest.approx(0.037609, rel=1e-4)


def test_h2_por_ah_56_celulas():
    # 56 × 0,037609 = 2,1061 g/Ah
    assert h2_por_carga(56).to("g/(A*h)").magnitude == pytest.approx(2.1061, rel=1e-4)


def test_ah_por_kg_uma_e_56_celulas():
    # 1000 / 0,037609 = 26 590 Ah/kg (valor do dossiê, que é por célula)
    # 1000 / 2,1061 = 474,8 Ah/kg (valor correto para o stack de 56 células)
    assert carga_por_h2(1).magnitude == pytest.approx(26590, rel=1e-3)
    assert carga_por_h2(56).magnitude == pytest.approx(474.8, rel=1e-3)


def test_vazao_h2_estequiometrica_65A():
    # 65,3 / 192 970,66 = 3,3839e-4 mol/s; × 22,414 L/mol × 60 s/min = 0,4551 slpm
    assert vazao_h2_estequiometrica(I_NOM).magnitude == pytest.approx(0.4551, rel=1e-3)


def test_vazao_h2_com_lambda_1_07():
    # 0,4551 × 1,07 = 0,4869 slpm, próximo dos "~0,5 slpm/célula" da folha
    assert vazao_h2_estequiometrica(I_NOM, 1.07).magnitude == pytest.approx(0.4869, rel=1e-3)


def test_vazao_ar_estequiometrica_65A():
    # O2 = I/(4F) = metade do H2 em mol; ar = O2 / 0,2095
    # 0,4551 / 2 / 0,2095 = 1,0861 slpm
    assert vazao_ar_estequiometrica(I_NOM).magnitude == pytest.approx(1.0861, rel=1e-3)


def test_lambda_implicito_50_slpm():
    # 50 / 1,0861 = 46,0
    assert estequiometria_ar_da_vazao(Q_(50, "L/min"), I_NOM) == pytest.approx(46.04, rel=1e-3)


def test_tensoes_termoneutras():
    # HHV: 285 830 / 192 970,66 = 1,4812 V; LHV: 241 830 / 192 970,66 = 1,2532 V
    assert tensao_termoneutra(DH_HHV).magnitude == pytest.approx(1.4812, abs=1e-4)
    assert tensao_termoneutra(DH_LHV).magnitude == pytest.approx(1.2532, abs=1e-4)


def test_eficiencia_tensao_066V():
    # 0,66 / 1,4812 = 0,4456; 0,66 / 1,2532 = 0,5267
    assert eficiencia_tensao(Q_(0.66, "V"), "HHV") == pytest.approx(0.4456, abs=1e-4)
    assert eficiencia_tensao(Q_(0.66, "V"), "LHV") == pytest.approx(0.5267, abs=1e-4)


def test_potencia_stack_56_celulas():
    # 56 × 0,63 × 65,3 = 2303,8 W (mínima); 56 × 0,66 × 65,3 = 2413,5 W (típica)
    assert potencia_stack(56, Q_(0.63, "V"), I_NOM).magnitude == pytest.approx(2303.8, abs=0.1)
    assert potencia_stack(56, Q_(0.66, "V"), I_NOM).magnitude == pytest.approx(2413.5, abs=0.1)


def test_calor_e_elevacao_temperatura_ar():
    # Q = 65,3 × (1,4812 − 0,66) = 53,62 W por célula
    # ṁ = 50 / 22,414 / 60 × 28,965 = 1,0769 g/s; ΔT = 53,62 / (1,0769e-3 × 1006) = 49,5 K
    q = calor_gerado(1, Q_(0.66, "V"), I_NOM, "HHV")
    assert q.magnitude == pytest.approx(53.62, abs=0.01)
    assert elevacao_temperatura_ar(q, Q_(50, "L/min")).magnitude == pytest.approx(49.5, abs=0.1)


def test_intervalo_purga_implicito():
    # 20 cm³ / 22 414 cm³/mol = 8,9230e-4 mol; × 2F = 172,19 C; / 0,07 = 2459,8 A·s
    it = intervalo_purga_implicito(Q_(20, "cm**3"), 1.07)
    assert it.to("A*s").magnitude == pytest.approx(2459.8, rel=1e-3)


def test_massa_h2_de_vazao_vazamento_bol():
    # 56 × 5 cm³/min = 280 cm³/min; / 22 414 × 2,01588 × 60 = 1,511 g/h
    m = massa_h2_de_vazao(Q_(280, "cm**3/min"))
    assert m.to("g/h").magnitude == pytest.approx(1.511, rel=1e-3)


def test_ajuste_linear_reta_exata():
    # Pontos sobre y = 2x + 1 devem devolver a = 2, b = 1 e R² = 1
    a, b, r2 = ajuste_linear([0, 1, 2], [1, 3, 5])
    assert (a, b, r2) == pytest.approx((2.0, 1.0, 1.0))


def test_tabela_tipica_e_coerente_v_vezes_i():
    # Sanidade: na Tabela 2, potência típica = tensão típica × corrente (±0,1 W)
    for v, p, i in zip(V_TIPICA_V, P_TIPICA_W, CORRENTE_TABELA_A):
        assert v * i == pytest.approx(p, abs=0.1)


def test_temperatura_recomendada_ajuste():
    # Ajuste da Tabela 3: inclinação 0,531 °C/A e intercepto 26,0 °C;
    # o dossiê usa 0,56 °C/A, que não sai desta tabela.
    a, b, r2 = ajuste_linear(CORRENTE_TABELA_A, T_RECOMENDADA_C)
    assert a == pytest.approx(0.5314, abs=1e-3)
    assert b == pytest.approx(26.0, abs=0.05)
    assert r2 > 0.999
