import bpy, math, pathlib, json, hashlib, sys
from mathutils import Vector
import argparse

args = argparse.ArgumentParser()
args.add_argument(
    "--output",
    type=pathlib.Path,
    default=pathlib.Path("/tmp/prototipo-bancada-mechanical-export"),
)
args.add_argument("--skip-preview", action="store_true")
options = args.parse_args(
    sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
)
OUT = options.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
MATS = {}
COLORS = {
    "aluminum": (0.43, 0.49, 0.54, 1),
    "cast": (0.19, 0.22, 0.24, 1),
    "steel": (0.12, 0.145, 0.17, 1),
    "darksteel": (0.033, 0.043, 0.053, 1),
    "rubber": (0.009, 0.013, 0.018, 1),
    "plastic": (0.018, 0.026, 0.036, 1),
    "orange": (0.92, 0.17, 0.018, 1),
    "copper": (0.49, 0.16, 0.055, 1),
    "silver": (0.52, 0.58, 0.62, 1),
    "blue": (0.035, 0.18, 0.32, 1),
    "red": (0.56, 0.018, 0.012, 1),
    "ivory": (0.51, 0.56, 0.49, 1),
    "yellow": (0.75, 0.54, 0.015, 1),
}
for name, color in COLORS.items():
    mat = bpy.data.materials.new("mechanical_" + name)
    mat.use_nodes = True
    b = mat.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = color
    b.inputs["Metallic"].default_value = (
        0.76
        if name in ["aluminum", "cast", "steel", "darksteel", "copper", "silver"]
        else 0.02
    )
    b.inputs["Roughness"].default_value = (
        0.37
        if name in ["cast", "steel"]
        else 0.24
        if name in ["aluminum", "silver", "copper"]
        else 0.67
        if name == "rubber"
        else 0.45
    )
    MATS[name] = mat
OBJECTS = []
SECTION = "main"
SEMANTIC = None


def semantic(pieceId, pieceLabel, section="engineExample", parentAssemblyId="engine"):
    global SEMANTIC, SECTION
    SECTION = section
    SEMANTIC = (pieceId, pieceLabel, parentAssemblyId)


def describe_piece(o, part, name):
    """Group small manufacturing details with the physical piece they describe."""
    if SEMANTIC:
        return SEMANTIC
    centroid = o.matrix_world @ (
        sum((v.co for v in o.data.vertices), Vector()) / max(1, len(o.data.vertices))
    )
    x, z = centroid.x, -centroid.y
    if part == "chassis":
        axle = "front" if SECTION == "frontSuspension" else "rear"
        axle_label = "dianteiro" if axle == "front" else "traseiro"
        side = "left" if z > 0 else "right"
        side_label = "esquerdo" if side == "left" else "direito"
        shared = {
            "formed_subframe_rail": ("subframe", "Subchassi"),
            "subframe_crossmember": ("subframe", "Subchassi"),
            "antiroll_bar": ("antiroll-bar", "Barra estabilizadora"),
            "differential": ("differential", "Diferencial ilustrativo"),
            "differential_cast_rib": ("differential", "Diferencial ilustrativo"),
        }
        if name in shared:
            key, label = shared[name]
            return (f"{axle}-{key}", f"{label} {axle_label}", part)
        pieces = {
            "lower_wishbone": ("control-arm", "Braço de suspensão"),
            "wishbone_brace": ("control-arm", "Braço de suspensão"),
            "upper_link": ("upper-link", "Tirante superior"),
            "rubber_mount": ("arm-mounts", "Buchas do braço"),
            "mount_sleeve": ("arm-mounts", "Buchas do braço"),
            "bearing_carrier": ("knuckle", "Manga de eixo e cubo"),
            "hub_bore": ("knuckle", "Manga de eixo e cubo"),
            "carrier_fastener": ("knuckle", "Manga de eixo e cubo"),
            "damper_body": ("damper", "Amortecedor"),
            "polished_damper_rod": ("damper", "Amortecedor"),
            "coil_spring": ("spring", "Mola helicoidal"),
            "spring_lower_seat": ("strut-mount", "Pratos e coxim da suspensão"),
            "upper_mount": ("strut-mount", "Pratos e coxim da suspensão"),
            "upper_mount_retainer": ("strut-mount", "Pratos e coxim da suspensão"),
            "strut_mount_stud": ("strut-mount", "Pratos e coxim da suspensão"),
            "damper_lower_clevis": ("damper", "Amortecedor"),
            "damper_clevis_pin": ("damper", "Amortecedor"),
            "lower_ball_joint_boot": ("knuckle", "Manga de eixo e cubo"),
            "top_nut": ("strut-mount", "Pratos e coxim da suspensão"),
            "antiroll_drop_link": ("drop-link", "Bieleta"),
            "halfshaft": ("halfshaft", "Semieixo e coifa"),
            "cv_boot_rib": ("halfshaft", "Semieixo e coifa"),
        }
        key, label = pieces[name]
        return (f"{axle}-{side}-{key}", f"{label} {axle_label} {side_label}", part)
    if part == "batteryHV":
        if name in (
            "cell_module",
            "module_cooling_fin",
            "busbar_terminal",
            "module_terminal_cap",
            "module_terminal_stud",
            "module_sense_connector",
        ):
            column = max(0, min(4, round((x + 0.41) / 0.37)))
            row = 1 if z > 0 else 0
            i = row * 5 + column + 1
            return (f"battery-module-{i:02d}", f"Módulo de células {i:02d}", part)
        groups = {
            "cooling_plate": ("battery-cooling-plate", "Placa de arrefecimento"),
            "coolant_channel": ("battery-cooling-plate", "Placa de arrefecimento"),
            "coolant_inlet": (
                "battery-cooling-connectors",
                "Conexões de arrefecimento",
            ),
            "coolant_outlet": (
                "battery-cooling-connectors",
                "Conexões de arrefecimento",
            ),
            "hv_junction": (
                "battery-hv-junction",
                "Caixa de distribuição de alta tensão",
            ),
            "hv_main_connector": ("battery-hv-connectors", "Conectores de alta tensão"),
            "hv_interconnect": ("battery-busbars", "Barramentos de interligação"),
            "bms_unit": ("battery-bms", "Unidade de gerenciamento da bateria"),
            "bms_connector": ("battery-bms", "Unidade de gerenciamento da bateria"),
            "hv_disconnect": ("battery-service-disconnect", "Desconector de serviço"),
        }
        aliases = {
            "intermodule_busbar": "hv_interconnect",
            "service_junction_base": "hv_junction",
            "hv_contactor_example": "hv_junction",
            "contactor_terminal": "hv_junction",
            "pack_connector_flange": "hv_main_connector",
            "pack_hv_receptacle": "hv_main_connector",
            "pack_socket_lockring": "hv_main_connector",
            "module_sense_loom": "bms_unit",
            "loom_retainer": "bms_unit",
        }
        name = aliases.get(name, name)
        if name in groups:
            key, label = groups[name]
            return key, label, part
        if SECTION == "batteryCover":
            return "battery-cover", "Tampa da bateria de tração", part
        return "battery-tray", "Bandeja e vedações da bateria", part
    groups = {
        "steeringRack": ("steering-rack", "Caixa de direção assistida"),
        "tractionMotor": ("electric-motor", "Motor elétrico de tração"),
        "inverter": ("traction-inverter", "Inversor e cabos de alta tensão"),
        "radiator": ("radiator", "Radiador e eletroventiladores"),
        "coolantReservoir": ("coolant-reservoir", "Reservatório de arrefecimento"),
        "exhaust": ("exhaust-assembly", "Escapamento e pós-tratamento"),
        "fuelTank": ("fuel-tank", "Tanque e alimentação de combustível"),
        "auxiliaryBattery": ("battery-12v", "Bateria auxiliar de 12 V"),
        "brakeHydraulics": ("brake-hydraulics", "Cilindro mestre e fluido de freio"),
        "OBDAndHarness": ("electronics-harness", "Eletrônica e conexão de diagnóstico"),
        "airbagModule": ("airbag-module", "Módulo ilustrativo de airbag"),
    }
    key, label = groups[SECTION]
    return key, label, part


def cv(v):
    return Vector((v[0], -v[2], v[1]))


def attach(o, part, name, mat):
    o.name = f"{part}__{SECTION}__{name}"
    o.data.materials.append(MATS[mat])
    o["partId"] = part
    o["section"] = SECTION
    piece_id, piece_label, parent_id = describe_piece(o, part, name)
    o["pieceId"] = piece_id
    o["pieceLabel"] = piece_label
    o["semanticPath"] = f"{part}/{SECTION}/{piece_id}"
    o["parentAssemblyId"] = parent_id
    o["mechanicalExample"] = True
    o["sourceType"] = "authored_illustrative"
    o["referenceBoard"] = {
        "engine": "assets/motor.webp",
        "chassis": "assets/chassi.webp",
        "steering": "assets/chassi.webp",
        "motorElectric": "assets/bateria.webp",
        "batteryHV": "assets/bateria.webp",
        "cooling": "assets/vehicle-exploded.webp",
        "exhaust": "assets/escapamento.webp",
        "tank": "assets/tanque.webp",
        "battery12v": "assets/vehicle-vector/previews/peca_27_bateria_12v.webp",
        "brakeFluid": "assets/freios.webp",
        "electronics": "assets/eletrica.webp",
        "airbag": "assets/ocupantes.webp",
    }.get(part, "assets/vehicle-exploded.webp")
    OBJECTS.append(o)
    return o


def apply(o):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.select_set(False)


def box(part, name, center, size, mat, bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=cv(center))
    o = bpy.context.object
    o.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new("Machined edges", "BEVEL")
        mod.width = min(bevel, min(size) * 0.42)
        mod.segments = 3
        mod = o.modifiers.new("Surface normals", "WEIGHTED_NORMAL")
        mod.keep_sharp = True
    apply(o)
    return attach(o, part, name, mat)


def cyl(part, name, center, radius, depth, mat, axisThree=(0, 1, 0), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=cv(center)
    )
    o = bpy.context.object
    o.rotation_euler = cv(axisThree).to_track_quat("Z", "Y").to_euler()
    mod = o.modifiers.new("Turned edge", "BEVEL")
    mod.width = min(radius * 0.09, 0.008, depth * 0.18)
    mod.segments = 2
    apply(o)
    for p in o.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return attach(o, part, name, mat)


def pipe(part, name, points, radius, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    curve.resolution_u = 12
    poly = curve.splines.new("BEZIER")
    poly.bezier_points.add(len(points) - 1)
    for p, co in zip(poly.bezier_points, points):
        p.co = cv(co)
        p.handle_left_type = "AUTO"
        p.handle_right_type = "AUTO"
    o = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o.select_set(False)
    for p in o.data.polygons:
        p.use_smooth = True
    return attach(o, part, name, mat)


def rod(part, name, a, b, radius, mat):
    a, b = Vector(a), Vector(b)
    delta = b - a
    return cyl(part, name, (a + b) / 2, radius, delta.length, mat, delta)


def torus(part, name, center, major, minor, mat, axisThree=(0, 1, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=40,
        minor_segments=8,
        location=cv(center),
    )
    o = bpy.context.object
    o.rotation_euler = cv(axisThree).to_track_quat("Z", "Y").to_euler()
    for p in o.data.polygons:
        p.use_smooth = True
    return attach(o, part, name, mat)


def sphere(part, name, center, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=24, ring_count=12, radius=1, location=cv(center)
    )
    o = bpy.context.object
    o.scale = (scale[0], scale[2], scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for p in o.data.polygons:
        p.use_smooth = True
    return attach(o, part, name, mat)


def bolt(part, name, center, radius, depth, mat, axisThree=(0, 1, 0)):
    return cyl(part, name, center, radius, depth, mat, axisThree, 6)


def helix(part, name, start, end, radius, turns, tube, mat):
    a = Vector(start)
    b = Vector(end)
    axis = (b - a).normalized()
    u = axis.cross(Vector((0, 0, 1)))
    if u.length < 0.1:
        u = axis.cross(Vector((1, 0, 0)))
    u.normalize()
    v = axis.cross(u)
    points = []
    for i in range(int(turns * 22) + 1):
        t = i / (turns * 22)
        theta = t * turns * 2 * math.pi
        points.append(
            a + (b - a) * t + (u * math.cos(theta) + v * math.sin(theta)) * radius
        )
    return pipe(part, name, points, tube, mat)


# Four-corner mechanical suspension assemblies, all within the supplied wheel footprint.
for axle, label in [(-1.58, "frontSuspension"), (1.416, "rearSuspension")]:
    SECTION = label
    part = "chassis"
    for z in [-0.40, 0.40]:
        box(
            part,
            "formed_subframe_rail",
            (axle, 0.25, z),
            (0.70, 0.095, 0.09),
            "darksteel",
            0.028,
        )
    for dx in [-0.27, 0.27]:
        pipe(
            part,
            "subframe_crossmember",
            [
                (axle + dx, 0.26, -0.5),
                (axle + dx * 0.75, 0.22, 0),
                (axle + dx, 0.26, 0.5),
            ],
            0.045,
            "darksteel",
        )
    for side in [-1, 1]:
        hub = (axle, 0.38, side * 0.79)
        for dx in [-0.25, 0.25]:
            rod(
                part,
                "lower_wishbone",
                (axle + dx, 0.24, side * 0.39),
                (axle - 0.02, 0.28, side * 0.78),
                0.034,
                "aluminum",
            )
        rod(
            part,
            "wishbone_brace",
            (axle - 0.25, 0.24, side * 0.39),
            (axle + 0.25, 0.24, side * 0.39),
            0.023,
            "aluminum",
        )
        for dx in [-0.25, 0.25]:
            cyl(
                part,
                "rubber_mount",
                (axle + dx, 0.25, side * 0.39),
                0.058,
                0.095,
                "rubber",
                (1, 0, 0),
            )
            cyl(
                part,
                "mount_sleeve",
                (axle + dx, 0.25, side * 0.39),
                0.025,
                0.105,
                "silver",
                (1, 0, 0),
            )
        for dx in [-0.18, 0.18]:
            rod(
                part,
                "upper_link",
                (axle + dx, 0.45, side * 0.40),
                (axle + 0.01, 0.48, side * 0.77),
                0.022,
                "steel",
            )
        cyl(part, "bearing_carrier", hub, 0.113, 0.11, "cast", (0, 0, 1))
        cyl(part, "hub_bore", hub, 0.055, 0.115, "darksteel", (0, 0, 1))
        for angle in range(0, 360, 90):
            a = math.radians(angle)
            bolt(
                part,
                "carrier_fastener",
                (axle + math.cos(a) * 0.079, 0.38 + math.sin(a) * 0.079, side * 0.858),
                0.012,
                0.015,
                "silver",
                (0, 0, 1),
            )
        bottom = (axle + 0.015, 0.41, side * 0.72)
        top = (axle + 0.10, 1.005, side * 0.67)
        rod(
            part,
            "damper_body",
            bottom,
            (axle + 0.06, 0.76, side * 0.695),
            0.043,
            "darksteel",
        )
        rod(
            part,
            "polished_damper_rod",
            (axle + 0.06, 0.70, side * 0.70),
            top,
            0.022,
            "silver",
        )
        helix(
            part,
            "coil_spring",
            (axle + 0.055, 0.63, side * 0.70),
            (axle + 0.095, 0.98, side * 0.673),
            0.096,
            6.4,
            0.0125,
            "blue",
        )
        axis = Vector(top) - Vector(bottom)
        cyl(
            part,
            "spring_lower_seat",
            (axle + 0.055, 0.61, side * 0.70),
            0.12,
            0.027,
            "steel",
            axis,
        )
        cyl(part, "upper_mount", top, 0.122, 0.038, "rubber", axis)
        cyl(
            part,
            "upper_mount_retainer",
            (axle + 0.10, 1.018, side * 0.669),
            0.103,
            0.018,
            "aluminum",
            axis,
        )
        for angle in range(0, 360, 120):
            a = math.radians(angle)
            bolt(
                part,
                "strut_mount_stud",
                (
                    axle + 0.10 + math.cos(a) * 0.083,
                    1.038,
                    side * 0.669 + math.sin(a) * 0.083,
                ),
                0.010,
                0.021,
                "steel",
            )
        bolt(
            part,
            "top_nut",
            (axle + 0.10, 1.035, side * 0.668),
            0.024,
            0.02,
            "silver",
            axis,
        )
        rod(
            part,
            "antiroll_drop_link",
            (axle + 0.23, 0.29, side * 0.57),
            (axle + 0.15, 0.60, side * 0.73),
            0.012,
            "steel",
        )
        # Formed attachment ears and ball-joint boots give the link a readable end.
        box(
            part,
            "damper_lower_clevis",
            (axle + 0.015, 0.425, side * 0.72),
            (0.095, 0.10, 0.055),
            "cast",
            0.016,
        )
        bolt(
            part,
            "damper_clevis_pin",
            (axle + 0.015, 0.425, side * 0.758),
            0.020,
            0.016,
            "silver",
            (0, 0, 1),
        )
        sphere(
            part,
            "lower_ball_joint_boot",
            (axle - 0.02, 0.28, side * 0.78),
            (0.047, 0.037, 0.047),
            "rubber",
        )
        # CV boot and halfshaft toward the differential; not a claimed manufacturer architecture.
        rod(
            part,
            "halfshaft",
            (axle, 0.36, side * 0.13),
            (axle, 0.36, side * 0.72),
            0.022,
            "steel",
        )
        for depth in range(6):
            torus(
                part,
                "cv_boot_rib",
                (axle, 0.36, side * (0.61 + depth * 0.016)),
                0.041 + depth * 0.0015,
                0.005,
                "rubber",
                (0, 0, 1),
            )
    pipe(
        part,
        "antiroll_bar",
        [
            (axle + 0.24, 0.28, -0.66),
            (axle + 0.33, 0.24, -0.4),
            (axle + 0.33, 0.24, 0.4),
            (axle + 0.24, 0.28, 0.66),
        ],
        0.017,
        "steel",
    )
    sphere(part, "differential", (axle, 0.35, 0), (0.15, 0.13, 0.17), "cast")
    for dx in [-0.09, -0.045, 0, 0.045, 0.09]:
        box(
            part,
            "differential_cast_rib",
            (axle + dx, 0.35, 0.158),
            (0.014, 0.18, 0.026),
            "aluminum",
            0.006,
        )
    if label == "frontSuspension":
        SECTION = "steeringRack"
        rod(
            "steering",
            "rack_housing",
            (axle + 0.16, 0.33, -0.42),
            (axle + 0.16, 0.33, 0.42),
            0.039,
            "aluminum",
        )
        for side in [-1, 1]:
            rod(
                "steering",
                "tie_rod",
                (axle + 0.16, 0.33, side * 0.4),
                (axle + 0.11, 0.37, side * 0.8),
                0.013,
                "steel",
            )
            for index in range(8):
                torus(
                    "steering",
                    "rack_boot",
                    (axle + 0.16, 0.33, side * (0.40 + index * 0.013)),
                    0.031,
                    0.005,
                    "rubber",
                    (0, 0, 1),
                )
        cyl(
            "steering",
            "assist_motor",
            (axle + 0.20, 0.39, 0.12),
            0.07,
            0.19,
            "darksteel",
            (1, 0, 0),
        )

SECTION = "tractionMotor"
cyl(
    "motorElectric",
    "ribbed_motor_casing",
    (-0.46, 0.59, 0),
    0.196,
    0.43,
    "aluminum",
    (1, 0, 0),
    48,
)
for x in [-0.63, -0.58, -0.53, -0.48, -0.43, -0.38, -0.33, -0.28]:
    torus("motorElectric", "cooling_rib", (x, 0.59, 0), 0.198, 0.007, "cast", (1, 0, 0))
for x in [-0.69, -0.23]:
    cyl("motorElectric", "end_cap", (x, 0.59, 0), 0.205, 0.024, "cast", (1, 0, 0), 48)
    for index in range(8):
        a = index * math.pi / 4
        bolt(
            "motorElectric",
            "motor_through_bolt",
            (x, 0.59 + math.sin(a) * 0.173, math.cos(a) * 0.173),
            0.011,
            0.026,
            "silver",
            (1, 0, 0),
        )
cyl("motorElectric", "output_shaft", (-0.16, 0.59, 0), 0.051, 0.14, "steel", (1, 0, 0))
# A short winding band expresses the electric-machine example without a fake transparent housing.
for i in range(18):
    a = math.pi * 2 * i / 18
    sphere(
        "motorElectric",
        "winding_end",
        (-0.235, 0.59 + math.cos(a) * 0.146, math.sin(a) * 0.146),
        (0.025, 0.023, 0.023),
        "copper",
    )
SECTION = "inverter"
box(
    "motorElectric",
    "inverter_body",
    (-0.43, 0.855, 0.05),
    (0.42, 0.14, 0.43),
    "aluminum",
    0.025,
)
for z in [-0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15]:
    box(
        "motorElectric",
        "inverter_top_rib",
        (-0.43, 0.934, 0.05 + z),
        (0.35, 0.012, 0.008),
        "cast",
        0.003,
    )
for x in [-0.59, -0.27]:
    for z in [-0.11, 0.21]:
        bolt("motorElectric", "inverter_lid_bolt", (x, 0.94, z), 0.009, 0.014, "silver")
# Two separate connector bodies, with strain-relief glands and routed cable pairs.
box(
    "motorElectric",
    "inverter_lid_seal",
    (-0.43, 0.922, 0.05),
    (0.426, 0.009, 0.436),
    "rubber",
    0.018,
)
for x in [-0.54, -0.32]:
    side = -1 if x < -0.43 else 1
    box(
        "motorElectric",
        "hv_connector_flange",
        (x, 0.84, 0.273),
        (0.082, 0.076, 0.018),
        "plastic",
        0.009,
    )
    cyl(
        "motorElectric",
        "hv_socket",
        (x, 0.84, 0.305),
        0.031,
        0.07,
        "orange",
        (0, 0, 1),
    )
    torus(
        "motorElectric",
        "hv_connector_lockring",
        (x, 0.84, 0.323),
        0.032,
        0.005,
        "plastic",
        (0, 0, 1),
    )
    for depth in range(4):
        torus(
            "motorElectric",
            "hv_cable_strain_relief",
            (x, 0.84, 0.35 + depth * 0.009),
            0.020,
            0.003,
            "rubber",
            (0, 0, 1),
        )
    pipe(
        "motorElectric",
        "orange_hv_cable",
        [
            (x, 0.84, 0.38),
            (x + 0.20, 0.63, 0.43 + side * 0.07),
            (0, 0.40, 0.49 + side * 0.07),
            (0.45, 0.36, 0.48 + side * 0.07),
        ],
        0.018,
        "orange",
    )
for z in [-0.08, 0.16]:
    cyl(
        "motorElectric",
        "inverter_coolant_union",
        (-0.665, 0.84, z),
        0.020,
        0.055,
        "silver",
        (1, 0, 0),
    )
    torus(
        "motorElectric",
        "coolant_union_bead",
        (-0.688, 0.84, z),
        0.021,
        0.003,
        "cast",
        (1, 0, 0),
    )
box(
    "motorElectric",
    "low_voltage_control_socket",
    (-0.43, 0.86, -0.185),
    (0.105, 0.045, 0.045),
    "plastic",
    0.006,
)
box(
    "motorElectric",
    "control_socket_latch",
    (-0.43, 0.89, -0.19),
    (0.045, 0.015, 0.038),
    "darksteel",
    0.004,
)

SECTION = "tractionBattery"
box(
    "batteryHV",
    "cast_lower_tray",
    (0.34, 0.26, 0),
    (1.95, 0.16, 1.23),
    "aluminum",
    0.042,
)
box(
    "batteryHV", "perimeter_seal", (0.34, 0.35, 0), (2.01, 0.025, 1.27), "rubber", 0.035
)
# Open module bank, visible in the exploded technical view.
for row in range(2):
    for column in range(5):
        x = -0.41 + column * 0.37
        z = -0.31 + row * 0.61
        box(
            "batteryHV",
            "cell_module",
            (x, 0.415, z),
            (0.33, 0.12, 0.53),
            "blue",
            0.016,
        )
        for terminal_z in [-0.20, 0.20]:
            box(
                "batteryHV",
                "module_terminal_cap",
                (x - 0.11, 0.482, z + terminal_z),
                (0.055, 0.016, 0.045),
                "orange",
                0.004,
            )
        for fin in [-0.21, -0.14, -0.07, 0, 0.07, 0.14, 0.21]:
            box(
                "batteryHV",
                "module_cooling_fin",
                (x, 0.405, z + fin),
                (0.338, 0.085, 0.009),
                "cast",
                0.003,
            )
        box(
            "batteryHV",
            "busbar_terminal",
            (x + 0.11, 0.475, z + 0.20),
            (0.04, 0.012, 0.05),
            "copper",
            0.003,
        )
        cyl(
            "batteryHV",
            "module_terminal_stud",
            (x + 0.11, 0.487, z + 0.20),
            0.009,
            0.014,
            "silver",
        )
        if column < 4:
            box(
                "batteryHV",
                "intermodule_busbar",
                (x + 0.285, 0.481, z + 0.20),
                (0.32, 0.008, 0.025),
                "copper",
                0.004,
            )
        box(
            "batteryHV",
            "module_sense_connector",
            (x - 0.10, 0.476, z - 0.21),
            (0.066, 0.025, 0.035),
            "plastic",
            0.005,
        )
for z in [-0.57, 0.57]:
    pipe(
        "batteryHV",
        "module_sense_loom",
        [(-0.55, 0.48, z), (0.25, 0.48, z), (1.17, 0.48, z)],
        0.009,
        "rubber",
    )
    for x in [-0.45, 0.29, 1.03]:
        box(
            "batteryHV",
            "loom_retainer",
            (x, 0.485, z),
            (0.035, 0.025, 0.034),
            "plastic",
            0.005,
        )
# The centre channel provides room for the service junction without covering cells.
box(
    "batteryHV",
    "service_junction_base",
    (0.89, 0.405, 0),
    (0.33, 0.10, 0.12),
    "plastic",
    0.014,
)
for x in [0.81, 0.98]:
    cyl("batteryHV", "hv_contactor_example", (x, 0.47, 0), 0.046, 0.068, "cast")
    bolt("batteryHV", "contactor_terminal", (x, 0.509, 0), 0.010, 0.014, "copper")
for z in [-0.12, 0.12]:
    box(
        "batteryHV",
        "pack_connector_flange",
        (-0.65, 0.29, z),
        (0.025, 0.086, 0.085),
        "plastic",
        0.007,
    )
    cyl(
        "batteryHV",
        "pack_hv_receptacle",
        (-0.695, 0.29, z),
        0.031,
        0.065,
        "orange",
        (1, 0, 0),
    )
    torus(
        "batteryHV",
        "pack_socket_lockring",
        (-0.725, 0.29, z),
        0.032,
        0.004,
        "rubber",
        (1, 0, 0),
    )
for x in [-0.66, 1.34]:
    for z in [-0.61, 0.61]:
        box(
            "batteryHV",
            "mount_tab",
            (x, 0.27, z),
            (0.12, 0.035, 0.18),
            "aluminum",
            0.015,
        )
        bolt("batteryHV", "tray_fixing", (x, 0.295, z), 0.015, 0.025, "steel")
for x in [-0.60, -0.25, 0.1, 0.45, 0.8, 1.20]:
    for z in [-0.64, 0.64]:
        bolt("batteryHV", "tray_perimeter_bolt", (x, 0.355, z), 0.009, 0.016, "silver")
# Low profile plate and visible service connections are distinct selectable pieces.
box(
    "batteryHV", "cooling_plate", (0.34, 0.363, 0), (1.89, 0.018, 1.17), "silver", 0.016
)
for channel_z in [-0.48, -0.24, 0, 0.24, 0.48]:
    box(
        "batteryHV",
        "coolant_channel",
        (0.34, 0.374, channel_z),
        (1.80, 0.008, 0.025),
        "aluminum",
        0.004,
    )
for z, name in [(-0.48, "coolant_inlet"), (-0.32, "coolant_outlet")]:
    cyl("batteryHV", name, (-0.71, 0.36, z), 0.024, 0.11, "silver", (1, 0, 0))
    torus("batteryHV", name, (-0.765, 0.36, z), 0.026, 0.005, "blue", (1, 0, 0))
box("batteryHV", "bms_unit", (-0.49, 0.42, 0), (0.20, 0.09, 0.12), "aluminum", 0.016)
for x in [-0.54, -0.44]:
    box(
        "batteryHV",
        "bms_connector",
        (x, 0.435, -0.075),
        (0.06, 0.045, 0.04),
        "plastic",
        0.006,
    )
SECTION = "batteryCover"
box("batteryHV", "stamped_lid", (0.34, 0.53, 0), (2.01, 0.035, 1.27), "aluminum", 0.028)
for x in [-0.37, 0.02, 0.41, 0.8, 1.19]:
    box("batteryHV", "lid_pressing", (x, 0.553, 0), (0.03, 0.015, 1.05), "cast", 0.007)
for z in [-0.53, 0.53]:
    box(
        "batteryHV",
        "lid_long_rib",
        (0.34, 0.554, z),
        (1.78, 0.015, 0.027),
        "cast",
        0.007,
    )
box(
    "batteryHV",
    "hv_disconnect",
    (0.91, 0.58, 0.44),
    (0.15, 0.06, 0.11),
    "orange",
    0.012,
)

SECTION = "radiator"
box(
    "cooling",
    "radiator_core",
    (-2.045, 0.76, 0),
    (0.065, 0.49, 1.17),
    "darksteel",
    0.012,
)
for y in range(27):
    box(
        "cooling",
        "radiator_fin",
        (-2.085, 0.53 + y * 0.018, 0),
        (0.018, 0.006, 1.12),
        "aluminum",
        0.002,
    )
for z in [-0.63, 0.63]:
    box("cooling", "side_tank", (-2.04, 0.76, z), (0.09, 0.55, 0.09), "plastic", 0.018)
for z in [-0.31, 0.31]:
    torus("cooling", "fan_shroud", (-1.97, 0.76, z), 0.23, 0.021, "plastic", (1, 0, 0))
    cyl("cooling", "fan_hub", (-1.96, 0.76, z), 0.054, 0.075, "plastic", (1, 0, 0))
    for blade in range(7):
        a = blade * math.pi * 2 / 7
        pipe(
            "cooling",
            "fan_blade",
            [
                (-1.955, 0.76, z),
                (-1.94, 0.76 + math.cos(a + 0.1) * 0.11, z + math.sin(a + 0.1) * 0.11),
                (
                    -1.935,
                    0.76 + math.cos(a + 0.35) * 0.205,
                    z + math.sin(a + 0.35) * 0.205,
                ),
            ],
            0.026,
            "plastic",
        )
pipe(
    "cooling",
    "upper_coolant_hose",
    [(-2.02, 0.99, 0.56), (-1.81, 1.04, 0.54), (-1.55, 0.98, 0.38)],
    0.028,
    "rubber",
)
pipe(
    "cooling",
    "lower_coolant_hose",
    [(-2.02, 0.54, -0.56), (-1.75, 0.49, -0.49), (-1.43, 0.57, -0.37)],
    0.025,
    "rubber",
)
SECTION = "coolantReservoir"
sphere("cooling", "expansion_tank", (-1.22, 0.98, -0.60), (0.16, 0.14, 0.13), "ivory")
cyl("cooling", "reservoir_cap", (-1.22, 1.12, -0.60), 0.062, 0.029, "plastic")

SECTION = "exhaust"
pipe(
    "exhaust",
    "stainless_exhaust_run",
    [
        (-1.35, 0.70, 0.39),
        (-1.04, 0.42, 0.37),
        (-0.55, 0.22, 0.38),
        (0.4, 0.20, 0.44),
        (1.35, 0.21, 0.48),
        (2.21, 0.27, 0.53),
    ],
    0.034,
    "silver",
)
for x, depth, radius in [(-0.59, 0.38, 0.095), (1.46, 0.55, 0.12)]:
    cyl(
        "exhaust",
        "catalyst_or_muffler",
        (x, 0.23, 0.43),
        radius,
        depth,
        "steel",
        (1, 0, 0),
        40,
    )
    for dx in [-depth * 0.48, depth * 0.48]:
        torus(
            "exhaust",
            "rolled_case_seam",
            (x + dx, 0.23, 0.43),
            radius,
            0.005,
            "silver",
            (1, 0, 0),
        )
rod("exhaust", "oxygen_sensor", (-0.8, 0.28, 0.43), (-0.8, 0.36, 0.43), 0.016, "steel")
pipe(
    "exhaust",
    "sensor_lead",
    [(-0.8, 0.36, 0.43), (-0.74, 0.42, 0.53), (-0.67, 0.48, 0.56)],
    0.006,
    "plastic",
)
for x in [0.1, 1.9]:
    pipe(
        "exhaust",
        "isolated_exhaust_hanger",
        [(x, 0.21, 0.43), (x, 0.30, 0.54), (x, 0.30, 0.65)],
        0.012,
        "steel",
    )

SECTION = "fuelTank"
box(
    "tank",
    "moulded_fuel_tank",
    (1.06, 0.36, -0.22),
    (0.68, 0.26, 0.82),
    "plastic",
    0.09,
)
for x in [0.84, 1.01, 1.18, 1.33]:
    box(
        "tank",
        "moulded_tank_reinforcement",
        (x, 0.35, 0.195),
        (0.033, 0.18, 0.022),
        "darksteel",
        0.009,
    )
for z in [-0.61, 0.17]:
    box(
        "tank",
        "mould_separation_seam",
        (1.06, 0.36, z),
        (0.55, 0.016, 0.025),
        "darksteel",
        0.006,
    )
for x in [0.81, 1.3]:
    box(
        "tank",
        "retaining_strap",
        (x, 0.22, -0.22),
        (0.055, 0.035, 0.86),
        "steel",
        0.014,
    )
    for z in [-0.62, 0.18]:
        box(
            "tank",
            "strap_mounting_ear",
            (x, 0.25, z),
            (0.10, 0.04, 0.065),
            "steel",
            0.01,
        )
        bolt("tank", "strap_mounting_bolt", (x, 0.279, z), 0.013, 0.02, "silver")
cyl("tank", "pump_access", (1.04, 0.51, -0.22), 0.12, 0.028, "cast")
for i in range(6):
    a = i * math.pi / 3
    bolt(
        "tank",
        "access_fastener",
        (1.04 + math.cos(a) * 0.09, 0.532, -0.22 + math.sin(a) * 0.09),
        0.009,
        0.013,
        "silver",
    )
pipe(
    "tank",
    "filler_neck",
    [(1.32, 0.43, -0.53), (1.64, 0.58, -0.65), (1.75, 0.91, -0.77)],
    0.035,
    "plastic",
)
cyl("tank", "fuel_cap", (1.75, 0.92, -0.77), 0.055, 0.028, "plastic", (0, 0, 1))
for x in [0.99, 1.09]:
    cyl("tank", "pump_line_quick_connector", (x, 0.545, -0.22), 0.016, 0.046, "plastic")
    pipe(
        "tank",
        "fuel_or_vent_line",
        [(x, 0.565, -0.22), (x - 0.13, 0.58, -0.35), (0.74, 0.52, -0.48)],
        0.009,
        "rubber",
    )
pipe(
    "tank",
    "filler_breather_hose",
    [(1.16, 0.51, -0.43), (1.50, 0.61, -0.60), (1.70, 0.85, -0.72)],
    0.012,
    "rubber",
)
for y, x, z in [(0.59, 1.64, -0.65), (0.88, 1.74, -0.77)]:
    torus("tank", "filler_hose_band", (x, y, z), 0.037, 0.004, "silver", (0.3, 1, -0.2))

SECTION = "auxiliaryBattery"
box(
    "battery12v",
    "battery_case",
    (-1.25, 0.86, 0.62),
    (0.28, 0.28, 0.25),
    "plastic",
    0.02,
)
box(
    "battery12v",
    "battery_top",
    (-1.25, 1.01, 0.62),
    (0.29, 0.035, 0.26),
    "darksteel",
    0.013,
)
box(
    "battery12v",
    "battery_base_flange",
    (-1.25, 0.725, 0.62),
    (0.305, 0.025, 0.274),
    "darksteel",
    0.008,
)
# Handle, six cell plugs and the hold-down make the familiar battery form legible.
for x in [-1.34, -1.16]:
    box(
        "battery12v",
        "handle_pivot",
        (x, 1.033, 0.70),
        (0.035, 0.025, 0.035),
        "plastic",
        0.007,
    )
pipe(
    "battery12v",
    "carrying_handle",
    [
        (-1.34, 1.036, 0.70),
        (-1.33, 1.058, 0.70),
        (-1.17, 1.058, 0.70),
        (-1.16, 1.036, 0.70),
    ],
    0.009,
    "plastic",
)
for x in [-1.34, -1.25, -1.16]:
    for z in [0.55, 0.60]:
        cyl("battery12v", "recessed_cell_plug", (x, 1.031, z), 0.015, 0.010, "plastic")
        box(
            "battery12v",
            "plug_slot",
            (x, 1.037, z),
            (0.018, 0.002, 0.003),
            "cast",
            0.001,
        )
for x in [-1.41, -1.09]:
    rod(
        "battery12v", "hold_down_rod", (x, 0.74, 0.68), (x, 1.025, 0.68), 0.006, "steel"
    )
    bolt("battery12v", "hold_down_nut", (x, 1.034, 0.68), 0.011, 0.014, "silver")
box(
    "battery12v",
    "hold_down_bridge",
    (-1.25, 1.025, 0.68),
    (0.35, 0.016, 0.022),
    "steel",
    0.004,
)
for x in [-1.34, -1.16]:
    cyl("battery12v", "terminal", (x, 1.04, 0.62), 0.018, 0.04, "silver")
    box(
        "battery12v",
        "terminal_cover",
        (x, 1.062, 0.62),
        (0.045, 0.026, 0.045),
        "red" if x < -1.2 else "plastic",
        0.006,
    )
for x in [-1.36, -1.30, -1.24, -1.18]:
    box(
        "battery12v",
        "moulded_rib",
        (x, 0.85, 0.755),
        (0.015, 0.23, 0.01),
        "cast",
        0.003,
    )
pipe(
    "battery12v",
    "positive_lead",
    [(-1.34, 1.06, 0.62), (-1.48, 1.05, 0.71), (-1.64, 0.88, 0.66)],
    0.009,
    "red",
)
pipe(
    "battery12v",
    "ground_lead",
    [(-1.16, 1.06, 0.62), (-1.07, 1.01, 0.70), (-0.98, 0.80, 0.66)],
    0.009,
    "plastic",
)

SECTION = "brakeHydraulics"
cyl(
    "brakeFluid",
    "vacuum_booster",
    (-0.73, 0.88, 0.57),
    0.13,
    0.10,
    "plastic",
    (1, 0, 0),
)
cyl(
    "brakeFluid", "master_cylinder", (-0.84, 0.88, 0.57), 0.035, 0.19, "cast", (1, 0, 0)
)
box(
    "brakeFluid",
    "fluid_reservoir",
    (-0.86, 1.01, 0.57),
    (0.17, 0.15, 0.16),
    "ivory",
    0.035,
)
cyl("brakeFluid", "reservoir_cap", (-0.85, 1.10, 0.57), 0.052, 0.025, "plastic")
torus(
    "brakeFluid",
    "booster_rolled_seam",
    (-0.73, 0.88, 0.57),
    0.129,
    0.007,
    "steel",
    (1, 0, 0),
)
cyl(
    "brakeFluid",
    "master_mounting_flange",
    (-0.79, 0.88, 0.57),
    0.066,
    0.02,
    "aluminum",
    (1, 0, 0),
)
for y in [0.832, 0.928]:
    bolt(
        "brakeFluid",
        "master_flange_nut",
        (-0.806, y, 0.57),
        0.010,
        0.020,
        "silver",
        (1, 0, 0),
    )
for x in [-0.91, -0.81]:
    cyl(
        "brakeFluid",
        "reservoir_rubber_grommet",
        (x, 0.943, 0.57),
        0.023,
        0.020,
        "rubber",
    )
for index in range(12):
    a = index * math.pi / 6
    box(
        "brakeFluid",
        "reservoir_cap_grip",
        (-0.85 + math.cos(a) * 0.049, 1.10, 0.57 + math.sin(a) * 0.049),
        (0.008, 0.018, 0.008),
        "darksteel",
        0.002,
    )
for y in [0.98, 1.035]:
    box(
        "brakeFluid",
        "reservoir_level_moulding",
        (-0.86, y, 0.652),
        (0.11, 0.005, 0.004),
        "ivory",
        0.001,
    )
box(
    "brakeFluid",
    "fluid_level_sensor",
    (-0.755, 1.015, 0.57),
    (0.035, 0.035, 0.055),
    "plastic",
    0.007,
)
box(
    "brakeFluid",
    "level_sensor_connector",
    (-0.73, 1.015, 0.57),
    (0.023, 0.025, 0.038),
    "darksteel",
    0.005,
)
for z in [0.53, 0.61]:
    bolt("brakeFluid", "brake_line_union", (-0.91, 0.88, z), 0.012, 0.022, "aluminum")
    pipe(
        "brakeFluid",
        "hard_brake_line",
        [(-0.91, 0.88, z), (-0.98, 0.72, z), (-1.24, 0.34, z)],
        0.005,
        "silver",
    )

SECTION = "OBDAndHarness"
box(
    "electronics",
    "ECU_housing",
    (-0.88, 0.91, -0.58),
    (0.23, 0.055, 0.15),
    "aluminum",
    0.009,
)
for z in [-0.63, -0.57, -0.51]:
    box("electronics", "ECU_rib", (-0.88, 0.943, z), (0.2, 0.008, 0.008), "cast", 0.002)
for x in [-0.96, -0.84]:
    box(
        "electronics",
        "connector",
        (x, 0.90, -0.68),
        (0.06, 0.045, 0.07),
        "plastic",
        0.004,
    )
pipe(
    "electronics",
    "engine_harness",
    [(-0.9, 0.91, -0.70), (-1.18, 1.02, -0.48), (-1.59, 1.03, -0.40)],
    0.016,
    "plastic",
)
box(
    "electronics",
    "OBD_diagnostic_socket",
    (-0.68, 1.04, 0.40),
    (0.055, 0.025, 0.08),
    "plastic",
    0.004,
)

SECTION = "airbagModule"
cyl(
    "airbag",
    "folded_airbag_carrier",
    (-0.37, 1.095, 0.398),
    0.070,
    0.032,
    "aluminum",
    (1, 0, 0),
)
box(
    "airbag",
    "retention_module_cover",
    (-0.345, 1.095, 0.398),
    (0.025, 0.125, 0.13),
    "plastic",
    0.022,
)
for y in [1.045, 1.145]:
    bolt(
        "airbag", "module_fixing", (-0.385, y, 0.398), 0.008, 0.016, "steel", (1, 0, 0)
    )
box(
    "airbag",
    "squib_connector",
    (-0.405, 1.06, 0.398),
    (0.025, 0.025, 0.035),
    "yellow",
    0.004,
)

# Engine authored separately for parallel modelling, using the same helpers and materials.
SECTION = "engineExample"
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from prototype_engine_geometry import build_engine

build_engine(
    dict(
        box=box,
        cyl=cyl,
        pipe=pipe,
        torus=torus,
        sphere=sphere,
        bolt=bolt,
        rod=rod,
        semantic=semantic,
    )
)

# Bake the assembled installation into the asset so the viewer, exports and
# selected-part bounds all share one pose. A raycast against the actual hood
# surface verifies the visual clearance; these are illustration coordinates.
engine_installation_offset = (0, -0.185, 0)
radiator_installation_offset = (0, -0.045, 0)
for o in OBJECTS:
    if o["partId"] == "engine":
        o.location += cv(engine_installation_offset)
    elif o["partId"] == "cooling" and o["section"] == "radiator":
        o.location += cv(radiator_installation_offset)

# Consolidate hardware only within the same semantic piece. Material children sit
# beneath one selectable group; ten battery modules never collapse into one mesh.
clusters = {}
for o in OBJECTS:
    clusters.setdefault(
        (o["partId"], o["section"], o["pieceId"], o.data.materials[0].name), []
    ).append(o)
piece_parents = {}
for key, items in clusters.items():
    bpy.ops.object.select_all(action="DESELECT")
    for o in items:
        o.select_set(True)
    bpy.context.view_layer.objects.active = items[0]
    if len(items) > 1:
        bpy.ops.object.join()
    o = bpy.context.object
    o.name = "__".join((key[2], key[3]))
    o["sourceMesh"] = o.name
    o["sourceFile"] = "authored/prototype/mechanical-supplement"
    if key[2] not in piece_parents:
        parent = bpy.data.objects.new(key[2], None)
        bpy.context.collection.objects.link(parent)
        for prop in [
            "partId",
            "section",
            "pieceId",
            "pieceLabel",
            "semanticPath",
            "parentAssemblyId",
            "mechanicalExample",
            "sourceType",
        ]:
            parent[prop] = o[prop]
        piece_parents[key[2]] = parent
    o.parent = piece_parents[key[2]]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "mechanical-supplement.glb"),
    export_format="GLB",
    use_selection=True,
    export_extras=True,
    export_yup=True,
    export_normals=True,
    export_materials="EXPORT",
    export_animations=False,
)
# Derive bounds in target Three.js Y-up coordinates.
bounds = {}
for o in bpy.context.scene.objects:
    if o.type != "MESH":
        continue
    pts = [o.matrix_world @ Vector(corner) for corner in o.bound_box]
    p = o["partId"]
    row = bounds.setdefault(p, {"min": [1e9] * 3, "max": [-1e9] * 3})
    for v in pts:
        values = [v.x, v.z, -v.y]
        for axis in range(3):
            row["min"][axis] = min(row["min"][axis], values[axis])
            row["max"][axis] = max(row["max"][axis], values[axis])
(OUT / "bounds.json").write_text(json.dumps(bounds, indent=2))
pieces = []
for piece_id, parent in piece_parents.items():
    entry = {
        key: parent[key]
        for key in [
            "partId",
            "section",
            "pieceId",
            "pieceLabel",
            "semanticPath",
            "parentAssemblyId",
        ]
    }
    entry["bounds"] = {"min": [1e9] * 3, "max": [-1e9] * 3}
    entry["meshCount"] = len(parent.children)
    for child in parent.children:
        for corner in child.bound_box:
            v = child.matrix_world @ Vector(corner)
            for axis, value in enumerate((v.x, v.z, -v.y)):
                entry["bounds"]["min"][axis] = min(entry["bounds"]["min"][axis], value)
                entry["bounds"]["max"][axis] = max(entry["bounds"]["max"][axis], value)
    pieces.append(entry)
(OUT / "semantic-pieces.json").write_text(
    json.dumps(pieces, indent=2, ensure_ascii=False) + "\n"
)
refs = [
    "assets/motor.webp",
    "assets/chassi.webp",
    "assets/bateria.webp",
    "assets/escapamento.webp",
    "assets/tanque.webp",
    "assets/vehicle-vector/previews/vehicle.webp",
]
repo = pathlib.Path(__file__).resolve().parents[2]
provenance = {
    "title": "Prototype: selectable generic hybrid mechanical systems",
    "creator": "Project-authored 3D illustration",
    "license": "Project-authored illustration; original 2D references retained under their existing provenance",
    "notice": "Generic educational mechanical example based on the existing 2D boards. It does not describe actual BMW X5 internal architecture, dimensions, required tests or regulatory conformity.",
    "coordinateSystem": "Three.js Y up, front negative X, visual proportional scale",
    "parts": sorted(bounds),
    "pieces": pieces,
    "pieceCount": len(pieces),
    "drawMeshCount": sum(p["meshCount"] for p in pieces),
    "sourceBaseline": "ba37f60338c0565384e7e31f6e8115c4545d06ce",
    "bounds": bounds,
    "referenceImages": [
        {"path": p, "sha256": hashlib.sha256((repo / p).read_bytes()).hexdigest()}
        for p in refs
    ],
    "method": "Authored Blender geometry; beveled cast parts, tubular manifolds, coil springs, modular battery and hybrid drive; no external 3D asset.",
    "sourceScript": "scripts/models/prototype_build_mechanical.py and scripts/models/prototype_engine_geometry.py",
    "asset": "assets/prototype/models/mechanical-supplement.glb",
    "sha256": hashlib.sha256(
        (OUT / "mechanical-supplement.glb").read_bytes()
    ).hexdigest(),
    "bytes": (OUT / "mechanical-supplement.glb").stat().st_size,
    "compression": "Uncompressed Blender intermediate; compress_mechanical.mjs produces the published asset",
    "mechanicalExample": True,
    "assembledInstallation": {
        "engineTranslation": list(engine_installation_offset),
        "radiatorTranslation": list(radiator_installation_offset),
        "purpose": "Visual clearance below the actual reference hood; not CAD dimensions or manufacturer architecture",
    },
    "authoredSources": [
        {"path": p, "sha256": hashlib.sha256((repo / p).read_bytes()).hexdigest()}
        for p in [
            "scripts/models/prototype_build_mechanical.py",
            "scripts/models/prototype_engine_geometry.py",
        ]
    ],
}
(OUT / "provenance.json").write_text(json.dumps(provenance, indent=2))
if options.skip_preview:
    print("MECHANICS_DONE", flush=True)
    sys.exit(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "mechanical-supplement.blend"))
# Thumbnail: the complete mechanical base under a neutral studio light.
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.cycles.use_denoising = False
world = bpy.data.worlds.new("Studio")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.2, 0.23, 0.26, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.7
scene.world = world
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0.04))
floor = bpy.context.object
floor.name = "StudioFloor"
floor.data.materials.append(MATS["rubber"])


def area(loc, power, size, color):
    bpy.ops.object.light_add(type="AREA", location=loc)
    o = bpy.context.object
    o.data.energy = power
    o.data.shape = "DISK"
    o.data.size = size
    o.data.color = color
    o.rotation_euler = (
        (Vector((0, 0, 0.6)) - o.location).to_track_quat("-Z", "Y").to_euler()
    )


area((-3, -4, 6), 1300, 5, (1, 0.94, 0.86))
area((3, 3, 4), 1500, 4, (0.82, 0.91, 1))
area((-4, 4, 2.8), 800, 4, (1, 1, 1))
bpy.ops.object.camera_add(location=(-5.2, -5.5, 4))
cam = bpy.context.object
cam.rotation_euler = (
    (Vector((-0.1, 0, 0.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
)
cam.data.lens = 55
scene.camera = cam
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "mechanical-preview.png")
scene.view_settings.view_transform = "AgX"
bpy.ops.render.render(write_still=True)
print("MECHANICS_DONE", flush=True)
