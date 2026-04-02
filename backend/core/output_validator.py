"""
OutputValidator — scans every number in Claude's output.
Numbers not in the metrics_dict (within ±15%) are stripped and logged.
"""

from __future__ import annotations

import re
from typing import Any


class OutputValidator:
    def validate(
        self,
        raw_output: dict[str, Any],
        metrics: dict[str, Any],
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        violations: list[dict[str, Any]] = []

        # Build the set of allowed numbers (±15% tolerance)
        allowed: set[float] = set()
        for v in metrics.values():
            if isinstance(v, (int, float)):
                fv = float(v)
                allowed.add(fv)
                allowed.add(round(fv * 1.15, 2))
                allowed.add(round(fv * 0.85, 2))

        def _is_allowed(num: float) -> bool:
            if num <= 5:  # small numbers (1,2,3,4,5) are always ok — days, steps, etc.
                return True
            return any(
                abs(num - a) / max(abs(a), 1) < 0.15
                for a in allowed
                if a > 0
            )

        def _scrub_string(text: str, field: str) -> str:
            number_pattern = re.compile(r'\b\d[\d,]*(?:\.\d+)?(?:%|k|K)?\b')

            def replace_if_hallucinated(m: re.Match) -> str:
                raw = m.group(0)
                # Normalise: strip commas, handle k suffix
                clean = raw.replace(",", "").rstrip("%").rstrip("kK")
                try:
                    num = float(clean)
                except ValueError:
                    return raw  # can't parse — leave it
                if raw.lower().endswith("k"):
                    num *= 1000
                if not _is_allowed(num):
                    violations.append(
                        {
                            "field": field,
                            "hallucinated_value": num,
                            "original_token": raw,
                            "action": "stripped",
                        }
                    )
                    return "[metric unavailable]"
                return raw

            return number_pattern.sub(replace_if_hallucinated, text)

        cleaned = {}
        for key, value in raw_output.items():
            if isinstance(value, str):
                cleaned[key] = _scrub_string(value, key)
            elif isinstance(value, list):
                new_list = []
                for item in value:
                    if isinstance(item, dict):
                        new_item = {}
                        for k, v in item.items():
                            if isinstance(v, str):
                                new_item[k] = _scrub_string(v, f"{key}.{k}")
                            else:
                                new_item[k] = v
                        new_list.append(new_item)
                    else:
                        new_list.append(item)
                cleaned[key] = new_list
            else:
                cleaned[key] = value

        return cleaned, violations
