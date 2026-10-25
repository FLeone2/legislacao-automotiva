"""Authored generic four-cylinder and transmission teaching model.

Visual reference: the repository's motor.webp board. This is not a BMW component,
CAD drawing, dimensional specification or proof of regulatory conformity.
All input coordinates use the application's X-front-negative/Y-up system.
"""

import math


def build_engine(api):
    box, cyl, pipe, torus, bolt = (
        api[k] for k in ("box", "cyl", "pipe", "torus", "bolt")
    )
    p = "engine"
    xaxis, yaxis, zaxis = (1, 0, 0), (0, 1, 0), (0, 0, 1)

    # Layered crankcase, gasket and cylinder head make the main cast architecture.
    box(
        p,
        "cast_aluminum_crankcase",
        (-1.41, 0.79, 0),
        (0.86, 0.42, 0.59),
        "cast",
        bevel=0.065,
    )
    box(
        p,
        "lower_casting_flange",
        (-1.41, 0.595, 0),
        (0.91, 0.045, 0.63),
        "aluminum",
        bevel=0.012,
    )
    box(
        p,
        "formed_oil_sump",
        (-1.39, 0.525, 0.015),
        (0.71, 0.15, 0.48),
        "darksteel",
        bevel=0.035,
    )
    box(
        p,
        "head_gasket",
        (-1.41, 1.006, 0),
        (0.92, 0.012, 0.615),
        "darksteel",
        bevel=0.004,
    )
    box(
        p,
        "alloy_cylinder_head",
        (-1.41, 1.07, 0),
        (0.93, 0.125, 0.62),
        "aluminum",
        bevel=0.025,
    )
    box(
        p,
        "cam_cover_gasket",
        (-1.42, 1.139, -0.005),
        (0.88, 0.018, 0.58),
        "rubber",
        bevel=0.014,
    )
    box(
        p,
        "molded_cam_cover",
        (-1.43, 1.19, -0.005),
        (0.86, 0.10, 0.55),
        "plastic",
        bevel=0.045,
    )
    box(
        p,
        "cam_cover_center_recess",
        (-1.43, 1.239, -0.01),
        (0.73, 0.008, 0.16),
        "rubber",
        bevel=0.025,
    )

    # Cast webs and machined core plugs break up the block without arbitrary boxes.
    for side in (-1, 1):
        for i, x in enumerate((-1.74, -1.55, -1.36, -1.17)):
            box(
                p,
                f"casting_web_{side}_{i}",
                (x, 0.80, side * 0.298),
                (0.027, 0.30, 0.026),
                "aluminum",
                bevel=0.008,
            )
            cyl(
                p,
                f"core_plug_{side}_{i}",
                (x + 0.055, 0.84, side * 0.306),
                0.043,
                0.013,
                "steel",
                axisThree=zaxis,
                vertices=24,
            )
        for x in (-1.79, -1.59, -1.37, -1.15, -1.00):
            bolt(
                p,
                "head_fastener",
                (x, 1.142, side * 0.255),
                0.014,
                0.018,
                "steel",
                axisThree=yaxis,
            )
        for x in (-1.75, -1.51, -1.27, -1.03):
            bolt(
                p,
                "oilpan_flange_fastener",
                (x, 0.573, side * 0.285),
                0.011,
                0.016,
                "steel",
                axisThree=yaxis,
            )

    # Four ignition coils and their electrical rail on a restrained black cover.
    for i, x in enumerate((-1.73, -1.54, -1.35, -1.16)):
        box(
            p,
            f"ignition_coil_{i}",
            (x, 1.252, 0.015),
            (0.105, 0.032, 0.104),
            "plastic",
            bevel=0.018,
        )
        box(
            p,
            f"coil_connector_{i}",
            (x, 1.248, 0.106),
            (0.057, 0.026, 0.057),
            "darksteel",
            bevel=0.008,
        )
    pipe(
        p,
        "ignition_loom",
        [
            (-1.80, 1.237, 0.17),
            (-1.55, 1.25, 0.17),
            (-1.28, 1.25, 0.17),
            (-1.02, 1.22, 0.14),
        ],
        0.012,
        "rubber",
    )
    cyl(
        p,
        "oil_filler_neck",
        (-1.06, 1.238, -0.13),
        0.050,
        0.035,
        "darksteel",
        axisThree=yaxis,
    )
    cyl(
        p,
        "oil_filler_cap",
        (-1.06, 1.265, -0.13),
        0.057,
        0.022,
        "plastic",
        axisThree=yaxis,
    )
    box(
        p,
        "oil_cap_grip",
        (-1.06, 1.282, -0.13),
        (0.070, 0.015, 0.019),
        "darksteel",
        bevel=0.006,
    )

    # Smooth intake runners and a plenum match the source board's recognizable forms.
    for i, x in enumerate((-1.73, -1.54, -1.35, -1.16)):
        pipe(
            p,
            f"intake_runner_{i}",
            [
                (x, 1.065, -0.28),
                (x, 1.11, -0.36),
                (x + 0.025, 1.07, -0.455),
                (x + 0.025, 0.976, -0.46),
            ],
            0.046,
            "plastic",
        )
        torus(
            p,
            f"intake_runner_clamp_{i}",
            (x, 1.066, -0.292),
            0.048,
            0.006,
            "steel",
            axisThree=zaxis,
        )
    cyl(
        p,
        "intake_plenum",
        (-1.40, 0.958, -0.461),
        0.091,
        0.75,
        "plastic",
        axisThree=xaxis,
    )
    cyl(
        p,
        "throttle_housing",
        (-0.98, 0.958, -0.461),
        0.095,
        0.11,
        "aluminum",
        axisThree=xaxis,
    )
    cyl(
        p,
        "throttle_actuator",
        (-0.965, 1.025, -0.435),
        0.040,
        0.076,
        "plastic",
        axisThree=zaxis,
    )
    torus(
        p,
        "throttle_band",
        (-0.936, 0.958, -0.461),
        0.094,
        0.007,
        "steel",
        axisThree=xaxis,
    )

    # Opposite-side exhaust manifold, four tubular runners into a single collector.
    for i, x in enumerate((-1.73, -1.54, -1.35, -1.16)):
        pipe(
            p,
            f"cast_exhaust_runner_{i}",
            [
                (x, 1.035, 0.30),
                (x, 1.00, 0.386),
                (x + 0.04, 0.87, 0.452),
                (-1.28, 0.73, 0.462),
            ],
            0.034,
            "cast",
        )
    cyl(
        p,
        "exhaust_collector",
        (-1.23, 0.710, 0.46),
        0.070,
        0.18,
        "cast",
        axisThree=xaxis,
    )
    pipe(
        p,
        "exhaust_downpipe_connection",
        [(-1.20, 0.71, 0.46), (-1.04, 0.64, 0.46), (-0.88, 0.54, 0.41)],
        0.052,
        "steel",
    )
    torus(
        p,
        "exhaust_flange",
        (-0.884, 0.546, 0.412),
        0.067,
        0.015,
        "aluminum",
        axisThree=xaxis,
    )

    # Timing cover and accessory belt on the front end, including an alternator.
    box(
        p,
        "timing_chain_cover",
        (-1.867, 0.855, 0.005),
        (0.045, 0.48, 0.58),
        "aluminum",
        bevel=0.035,
    )
    pulley_specs = [
        (0.64, -0.02, 0.116),
        (0.964, 0.365, 0.080),
        (1.022, -0.20, 0.067),
        (0.800, -0.245, 0.057),
    ]
    for i, (y, z, radius) in enumerate(pulley_specs):
        cyl(
            p,
            f"accessory_pulley_{i}",
            (-1.914, y, z),
            radius,
            0.040,
            "darksteel",
            axisThree=xaxis,
            vertices=40,
        )
        torus(
            p,
            f"pulley_lip_{i}",
            (-1.940, y, z),
            radius * 0.94,
            0.007,
            "steel",
            axisThree=xaxis,
        )
        bolt(
            p,
            f"pulley_center_{i}",
            (-1.949, y, z),
            0.023,
            0.025,
            "steel",
            axisThree=xaxis,
        )
    # Three adjacent thin runs read as a flat serpentine belt rather than a hose.
    belt = [
        (0.55, -0.06),
        (0.59, 0.092),
        (0.89, 0.445),
        (1.03, 0.395),
        (1.05, 0.27),
        (1.085, -0.19),
        (1.035, -0.265),
        (0.79, -0.305),
        (0.70, -0.22),
        (0.55, -0.06),
    ]
    for n, offset in enumerate((-0.010, 0, 0.010)):
        pipe(
            p,
            f"serpentine_belt_{n}",
            [(-1.955 + offset, y, z) for y, z in belt],
            0.008,
            "rubber",
        )
    cyl(
        p,
        "alternator_body",
        (-1.777, 0.967, 0.365),
        0.119,
        0.205,
        "aluminum",
        axisThree=xaxis,
        vertices=40,
    )
    cyl(
        p,
        "alternator_rear_case",
        (-1.664, 0.967, 0.365),
        0.105,
        0.042,
        "cast",
        axisThree=xaxis,
    )
    for i in range(10):
        a = i * math.tau / 10
        y, z = 0.967 + math.sin(a) * 0.094, 0.365 + math.cos(a) * 0.094
        box(
            p,
            f"alternator_cooling_slot_{i}",
            (-1.780, y, z),
            (0.145, 0.012, 0.019),
            "darksteel",
            bevel=0.004,
        )
    pipe(
        p,
        "alternator_power_cable",
        [(-1.655, 1.01, 0.37), (-1.55, 1.13, 0.37), (-1.26, 1.12, 0.32)],
        0.012,
        "rubber",
    )

    # Rear bellhousing and stepped cast transmission with circumferential fins.
    cyl(
        p,
        "transmission_bellhousing",
        (-0.902, 0.725, 0.005),
        0.267,
        0.275,
        "aluminum",
        axisThree=xaxis,
        vertices=48,
    )
    cyl(
        p,
        "bellhousing_register",
        (-1.041, 0.725, 0.005),
        0.276,
        0.025,
        "cast",
        axisThree=xaxis,
        vertices=48,
    )
    cyl(
        p,
        "transmission_main_case",
        (-0.62, 0.695, 0.005),
        0.205,
        0.38,
        "cast",
        axisThree=xaxis,
        vertices=40,
    )
    cyl(
        p,
        "transmission_tail_case",
        (-0.371, 0.685, 0.005),
        0.138,
        0.20,
        "aluminum",
        axisThree=xaxis,
        vertices=36,
    )
    box(
        p,
        "transmission_lower_sump",
        (-0.615, 0.526, 0.005),
        (0.46, 0.066, 0.32),
        "darksteel",
        bevel=0.018,
    )
    for i, x in enumerate((-0.760, -0.695, -0.630, -0.565, -0.500, -0.435)):
        torus(
            p,
            f"gearbox_cast_rib_{i}",
            (x, 0.695, 0.005),
            0.210 if i < 4 else 0.175,
            0.013,
            "aluminum",
            axisThree=xaxis,
        )
    for i in range(7):
        a = i * math.tau / 7
        bolt(
            p,
            f"bellhousing_fastener_{i}",
            (-1.060, 0.725 + math.sin(a) * 0.239, 0.005 + math.cos(a) * 0.239),
            0.015,
            0.025,
            "steel",
            axisThree=xaxis,
        )
    cyl(
        p,
        "driveshaft_output_flange",
        (-0.249, 0.685, 0.005),
        0.086,
        0.038,
        "steel",
        axisThree=xaxis,
    )
    cyl(
        p,
        "output_spline",
        (-0.209, 0.685, 0.005),
        0.042,
        0.054,
        "darksteel",
        axisThree=xaxis,
    )

    # A few purposeful support/details: mounts, oil filter, coolant hose and dipstick.
    for side in (-1, 1):
        box(
            p,
            f"engine_mount_bracket_{side}",
            (-1.41, 0.65, side * 0.357),
            (0.20, 0.10, 0.17),
            "cast",
            bevel=0.025,
        )
        cyl(
            p,
            f"rubber_engine_mount_{side}",
            (-1.41, 0.591, side * 0.397),
            0.065,
            0.072,
            "rubber",
            axisThree=yaxis,
        )
    cyl(
        p, "oil_filter", (-1.57, 0.622, -0.356), 0.056, 0.15, "plastic", axisThree=yaxis
    )
    torus(
        p,
        "oil_filter_end_ring",
        (-1.57, 0.546, -0.356),
        0.048,
        0.005,
        "steel",
        axisThree=yaxis,
    )
    pipe(
        p,
        "coolant_outlet_hose",
        [(-1.83, 1.025, -0.24), (-1.96, 1.005, -0.30), (-1.985, 0.86, -0.34)],
        0.032,
        "rubber",
    )
    torus(
        p,
        "coolant_hose_clip",
        (-1.84, 1.024, -0.244),
        0.035,
        0.005,
        "steel",
        axisThree=xaxis,
    )
    pipe(
        p,
        "oil_dipstick_tube",
        [(-1.15, 0.68, 0.32), (-1.07, 0.94, 0.36), (-1.04, 1.10, 0.34)],
        0.008,
        "steel",
    )
    torus(
        p,
        "yellow_oil_dipstick_handle",
        (-1.04, 1.121, 0.34),
        0.024,
        0.008,
        "yellow",
        axisThree=zaxis,
    )
