"""Ideal circular coplanar Hohmann reference; independent of Orbitlab imports.

Example: python hohmann_reference.py --r1-m 6778137 --r2-m 7178137
Outputs signed tangential impulses; positive means prograde.
Surface clearance and any finite-burn/perturbation model are outside scope.
"""

import argparse
import json
import math


def reference(r1_m: float, r2_m: float, mu_m3_s2: float) -> dict:
    for name, value in (("r1_m", r1_m), ("r2_m", r2_m), ("mu_m3_s2", mu_m3_s2)):
        if not math.isfinite(value) or value <= 0:
            raise ValueError(f"{name} must be finite and positive")
    a_m = (r1_m + r2_m) / 2
    vc1 = math.sqrt(mu_m3_s2 / r1_m)
    vc2 = math.sqrt(mu_m3_s2 / r2_m)
    vt1 = math.sqrt(mu_m3_s2 * (2 / r1_m - 1 / a_m))
    vt2 = math.sqrt(mu_m3_s2 * (2 / r2_m - 1 / a_m))
    dv1, dv2 = vt1 - vc1, vc2 - vt2
    half_period = math.pi * math.sqrt(a_m**3 / mu_m3_s2)
    return {
        "model": "ideal_two_body_coplanar_circular_impulsive",
        "inputs": {"r1_m": r1_m, "r2_m": r2_m, "mu_m3_s2": mu_m3_s2},
        "transfer_semimajor_axis_m": a_m,
        "circular_speeds_m_s": [vc1, vc2],
        "transfer_endpoint_speeds_m_s": [vt1, vt2],
        "signed_tangential_dv_m_s": [dv1, dv2],
        "total_dv_m_s": abs(dv1) + abs(dv2),
        "transfer_time_s": 0.0 if r1_m == r2_m else half_period,
        "ellipse_half_period_s": half_period,
        "time_convention": "equal radii: no maneuver and zero elapsed transfer time",
        "coast_specific_energy_m2_s2": -mu_m3_s2 / (2 * a_m),
        "coast_angular_momentum_m2_s": [r1_m * vt1, r2_m * vt2],
        "limitations": ["positive radii only; no surface-clearance check", "no finite burns, drag, J2, plane change or rendezvous phasing"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--r1-m", type=float, required=True)
    parser.add_argument("--r2-m", type=float, required=True)
    parser.add_argument("--mu-m3-s2", type=float, default=3.986004418e14,
                        help="Gravitational parameter; default matches the inspected Earth model")
    args = parser.parse_args()
    try:
        result = reference(args.r1_m, args.r2_m, args.mu_m3_s2)
        output = json.dumps(result, indent=2, allow_nan=False)
    except (ValueError, OverflowError) as exc:
        parser.error(str(exc))
    print(output)


if __name__ == "__main__":
    main()
